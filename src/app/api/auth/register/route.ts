import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signAccessToken, signRefreshToken } from '@/lib/auth'
import { initializeWorkspaceLedgerAccounts } from '@/lib/ledger'
import { z } from 'zod'

const registerSchema = z.object({
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Phone number must be valid'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Create unique slug for workspace
    const baseSlug = validated.workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`

    // Transaction to create Workspace, User, and default General Ledger accounts
    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: validated.workspaceName,
          slug: slug,
          email: validated.email,
          phone: validated.phone,
        },
      })

      const passwordHash = await hashPassword(validated.password)

      const user = await tx.user.create({
        data: {
          workspace_id: workspace.id,
          email: validated.email,
          password_hash: passwordHash,
          first_name: validated.firstName,
          last_name: validated.lastName,
          phone: validated.phone,
          role: 'WORKSPACE_ADMIN',
        },
      })

      return { workspace, user }
    })

    // Initialize Chart of Accounts for the new workspace
    await initializeWorkspaceLedgerAccounts(result.workspace.id)

    // Sign JWT tokens
    const payload = {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      workspaceId: result.workspace.id,
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    const response = NextResponse.json(
      {
        message: 'Workspace and Admin account created successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          role: result.user.role,
        },
        workspace: {
          id: result.workspace.id,
          name: result.workspace.name,
          slug: result.workspace.slug,
        },
        accessToken,
      },
      { status: 201 }
    )

    // Set secure cookie
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400, // 1 day
      path: '/',
    })

    return response
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error during registration' }, { status: 500 })
  }
}
