import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PropertyType } from '@prisma/client'
import { resolveWorkspaceContext } from '@/lib/workspace-context'
import { z } from 'zod'

const propertySchema = z.object({
  name: z.string().min(2, 'Property name is required'),
  address: z.string().min(5, 'Address is required'),
  propertyType: z.nativeEnum(PropertyType),
  amenities: z.array(z.string()).optional().default([]),
  floorsCount: z.number().int().min(1, 'At least 1 floor is required'),
  roomsPerFloor: z.number().int().min(1, 'At least 1 room per floor is required'),
  bedsPerRoom: z.number().int().min(1, 'At least 1 bed per room is required'),
  defaultRent: z.number().min(0),
  defaultDeposit: z.number().min(0),
})

export async function GET(request: Request) {
  const ctx = await resolveWorkspaceContext(request)
  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
  }

  const properties = await prisma.property.findMany({
    where: {
      workspace_id: ctx.workspaceId,
      deleted_at: null,
    },
    include: {
      floors: {
        include: {
          rooms: {
            include: {
              beds: true,
            },
          },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ properties })
}

export async function POST(request: Request) {
  const ctx = await resolveWorkspaceContext(request)

  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
  }

  const role = ctx.role
  if (role !== 'WORKSPACE_ADMIN' && role !== 'PLATFORM_SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create property' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validated = propertySchema.parse(body)

    const property = await prisma.$transaction(async (tx) => {
      // 1. Create Property
      const newProperty = await tx.property.create({
        data: {
          workspace_id: ctx.workspaceId!,
          name: validated.name,
          address: validated.address,
          property_type: validated.propertyType,
          amenities: validated.amenities,
        },
      })

      // 2. Create Floors, Rooms, and Beds dynamically
      for (let f = 1; f <= validated.floorsCount; f++) {
        const floor = await tx.floor.create({
          data: {
            workspace_id: ctx.workspaceId!,
            property_id: newProperty.id,
            floor_number: f,
            name: `Floor ${f}`,
          },
        })

        for (let r = 1; r <= validated.roomsPerFloor; r++) {
          const roomNumber = `${f}0${r}`
          const room = await tx.room.create({
            data: {
              workspace_id: ctx.workspaceId!,
              property_id: newProperty.id,
              floor_id: floor.id,
              room_number: roomNumber,
              capacity: validated.bedsPerRoom,
              rent_amount: validated.defaultRent,
              deposit_amount: validated.defaultDeposit,
              amenities: validated.amenities,
            },
          })

          for (let b = 1; b <= validated.bedsPerRoom; b++) {
            await tx.bed.create({
              data: {
                workspace_id: ctx.workspaceId!,
                property_id: newProperty.id,
                room_id: room.id,
                bed_number: `${roomNumber}-${String.fromCharCode(64 + b)}`,
                status: 'VACANT',
              },
            })
          }
        }
      }

      return newProperty
    })

    return NextResponse.json({ message: 'Property setup created successfully', property }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Property creation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create property' }, { status: 500 })
  }
}
