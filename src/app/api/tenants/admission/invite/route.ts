import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { resolveWorkspaceContext } from '@/lib/workspace-context'

const createInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  bedId: z.string().uuid('Bed selection is required'),
  rentAmount: z.number().positive(),
  depositAmount: z.number().positive(),
  expiresInDays: z.number().int().default(7),
})



// GET /api/tenants/admission/invite -> List all pending admission invites
export async function GET(request: Request) {
  const ctx = await resolveWorkspaceContext(request)
  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
  }

  try {
    const invites = await prisma.admissionInvite.findMany({
      where: {
        workspace_id: ctx.workspaceId,
        is_used: false,
      },
      include: {
        bed: {
          include: {
            room: {
              include: {
                property: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ invites })
  } catch (error: any) {
    console.error('GET Admission Invite Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch invites' }, { status: 500 })
  }
}

// POST /api/tenants/admission/invite -> Generate tokenized invite link & reserve bed
export async function POST(request: Request) {
  const ctx = await resolveWorkspaceContext(request)

  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
  }

  if (ctx.role !== 'WORKSPACE_ADMIN' && ctx.role !== 'MANAGER' && ctx.role !== 'PLATFORM_SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validated = createInviteSchema.parse(body)

    // Check if bed is available
    const bed = await prisma.bed.findFirst({
      where: {
        id: validated.bedId,
        workspace_id: ctx.workspaceId,
      },
    })

    if (!bed) {
      return NextResponse.json({ error: 'Selected bed not found in workspace' }, { status: 404 })
    }

    if (bed.status !== 'VACANT') {
      return NextResponse.json({ error: `Selected bed is currently ${bed.status} and cannot be assigned` }, { status: 400 })
    }

    // Generate secure random token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + validated.expiresInDays)

    // Transaction to reserve bed & create tokenized admission invite
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark bed status as RESERVED
      await tx.bed.update({
        where: { id: bed.id },
        data: { status: 'RESERVED' },
      })

      // 2. Create AdmissionInvite record
      const invite = await tx.admissionInvite.create({
        data: {
          workspace_id: ctx.workspaceId!,
          token: token,
          email: validated.email,
          first_name: validated.firstName,
          last_name: validated.lastName,
          phone: validated.phone,
          bed_id: bed.id,
          rent_amount: validated.rentAmount,
          deposit_amount: validated.depositAmount,
          expires_at: expiresAt,
        },
      })

      return invite
    })

    const publicAdmissionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admission/${result.token}`

    // Automatically send invitation email to resident
    try {
      const { dispatchNotification } = await import('@/lib/notifications/dispatcher')
      await dispatchNotification('EMAIL', validated.email, {
        subject: `Welcome to PG_SAS — Complete Your Digital Admission`,
        body: `Hello ${validated.firstName},<br><br>You have been invited to complete your digital admission. Please follow the link below to set your password, upload KYC documents, and complete onboarding:<br><br><a href="${publicAdmissionUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Admission</a><br><br>Or copy this link: ${publicAdmissionUrl}<br><br>This invitation expires on ${expiresAt.toLocaleDateString()}.`,
      })

    } catch (emailErr) {
      console.warn('Failed to send admission invitation email:', emailErr)
    }

    return NextResponse.json(
      {
        message: 'Tokenized admission invite generated, bed reserved, and email sent successfully',
        invite: result,
        publicAdmissionUrl,
      },
      { status: 201 }
    )

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Admission invite error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate admission invite' }, { status: 500 })
  }
}
