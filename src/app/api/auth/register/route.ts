import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signAccessToken, signRefreshToken } from '@/lib/auth'
import { initializeWorkspaceLedgerAccounts } from '@/lib/ledger/coa'
import { Prisma, PropertyType } from '@prisma/client'
import { z } from 'zod'

const registerSchema = z.object({
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Phone number must be valid'),
  // Optional initial property setup
  branchName: z.string().optional(),
  address: z.string().optional(),
  propertyType: z.string().optional(),
  floorsCount: z.number().optional(),
  roomsPerFloor: z.number().optional(),
  bedsPerRoom: z.number().optional(),
  defaultRent: z.number().optional(),
  defaultDeposit: z.number().optional(),
  amenities: z.array(z.string()).optional(),
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
      return NextResponse.json({ error: 'User with this email already exists. Please log in.' }, { status: 400 })
    }

    // Create unique slug for workspace
    const baseSlug = validated.workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`

    // Transaction to create Workspace, User, Property Inventory, and default General Ledger accounts with 30s timeout
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 1. Create Workspace
        const workspace = await tx.workspace.create({
          data: {
            name: validated.workspaceName,
            slug: slug,
            email: validated.email,
            phone: validated.phone,
          },
        })

        // 2. Create Admin User
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

        // 3. Create Property Inventory if setup details are provided
        if (validated.branchName || validated.floorsCount) {
          const propType = (validated.propertyType as PropertyType) || PropertyType.PG
          const floorsCount = validated.floorsCount || 4
          const roomsPerFloor = validated.roomsPerFloor || 5
          const bedsPerRoom = validated.bedsPerRoom || 2
          const defaultRent = validated.defaultRent || 8500
          const defaultDeposit = validated.defaultDeposit || 8500

          const newProperty = await tx.property.create({
            data: {
              workspace_id: workspace.id,
              name: validated.branchName || `${validated.workspaceName} Main Branch`,
              address: validated.address || 'Main Location',
              property_type: propType,
              amenities: validated.amenities || [],
            },
          })

          const bedsToCreate: any[] = []

          for (let f = 1; f <= floorsCount; f++) {
            const floor = await tx.floor.create({
              data: {
                workspace_id: workspace.id,
                property_id: newProperty.id,
                floor_number: f,
                name: `Floor ${f}`,
              },
            })

            for (let r = 1; r <= roomsPerFloor; r++) {
              const roomNumber = `${f}0${r}`
              const room = await tx.room.create({
                data: {
                  workspace_id: workspace.id,
                  property_id: newProperty.id,
                  floor_id: floor.id,
                  room_number: roomNumber,
                  capacity: bedsPerRoom,
                  rent_amount: defaultRent,
                  deposit_amount: defaultDeposit,
                  amenities: validated.amenities || [],
                },
              })

              for (let b = 1; b <= bedsPerRoom; b++) {
                bedsToCreate.push({
                  workspace_id: workspace.id,
                  property_id: newProperty.id,
                  room_id: room.id,
                  bed_number: `${roomNumber}-${String.fromCharCode(64 + b)}`,
                  status: 'VACANT',
                })
              }
            }
          }

          // Bulk insert all beds in 1 query
          if (bedsToCreate.length > 0) {
            await tx.bed.createMany({
              data: bedsToCreate,
            })
          }
        }

        return { workspace, user }
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    )

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

    const response = NextResponse.json(
      {
        message: 'Workspace, Admin Account, and Property provisioned successfully',
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
      httpOnly: fontIsProd(),
      secure: fontIsProd(),
      sameSite: 'lax',
      maxAge: 86400, // 1 day
      path: '/',
    })

    return response
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Registration error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error during registration' }, { status: 500 })
  }
}

function fontIsProd() {
  return process.env.NODE_ENV === 'production'
}
