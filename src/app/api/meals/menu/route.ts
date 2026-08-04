import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MealSlotType } from '@prisma/client'
import { z } from 'zod'

const menuSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  slot: z.nativeEnum(MealSlotType),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  vegAvailable: z.boolean().default(true),
  nonVegAvailable: z.boolean().default(false),
  vegPrice: z.number().min(0).default(0),
  nonVegPrice: z.number().min(0).default(0),
  cutoffTime: z.string(), // ISO string date-time
  isCanceled: z.boolean().optional().default(false),
})

export async function GET(request: Request) {
  const workspaceId = request.headers.get('x-workspace-id')
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const menus = await prisma.mealMenu.findMany({
    where: {
      workspace_id: workspaceId,
      date: new Date(dateStr),
    },
    include: {
      selections: true,
    },
    orderBy: { slot: 'asc' },
  })

  return NextResponse.json({ menus })
}

export async function POST(request: Request) {
  const workspaceId = request.headers.get('x-workspace-id')
  const role = request.headers.get('x-user-role')

  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'WORKSPACE_ADMIN' && role !== 'MANAGER' && role !== 'PLATFORM_SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin or Manager role required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validated = menuSchema.parse(body)

    const menuDate = new Date(validated.date)
    const cutoff = new Date(validated.cutoffTime)

    const menu = await prisma.mealMenu.upsert({
      where: {
        workspace_id_date_slot: {
          workspace_id: workspaceId,
          date: menuDate,
          slot: validated.slot,
        },
      },
      update: {
        title: validated.title,
        description: validated.description,
        veg_available: validated.vegAvailable,
        non_veg_available: validated.nonVegAvailable,
        veg_price: validated.vegPrice,
        non_veg_price: validated.nonVegPrice,
        cutoff_time: cutoff,
        is_canceled: validated.isCanceled,
      },
      create: {
        workspace_id: workspaceId,
        date: menuDate,
        slot: validated.slot,
        title: validated.title,
        description: validated.description,
        veg_available: validated.vegAvailable,
        non_veg_available: validated.nonVegAvailable,
        veg_price: validated.vegPrice,
        non_veg_price: validated.nonVegPrice,
        cutoff_time: cutoff,
        is_canceled: validated.isCanceled,
      },
    })

    return NextResponse.json({ message: 'Meal menu updated successfully', menu })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Meal menu publishing error:', error)
    return NextResponse.json({ error: 'Failed to publish meal menu' }, { status: 500 })
  }
}
