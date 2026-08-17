import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordMealAuditLog, emitMealEvent, getWorkspaceBillingConfig } from '@/lib/mess/mess_engine'
import { MealSlotType, CancelReason, FoodCategory } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '@/lib/rbac'

const menuItemSchema = z.object({
  category: z.nativeEnum(FoodCategory).default('MAIN_ITEM'),
  name: z.string().min(1, 'Item name is required'),
  isVeg: z.boolean().default(true),
})

const menuSchema = z.object({
  id: z.string().optional(),
  date: z.string(), // YYYY-MM-DD
  slot: z.nativeEnum(MealSlotType),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  isSpecial: z.boolean().default(false),
  specialTag: z.string().optional(),
  vegAvailable: z.boolean().default(true),
  nonVegAvailable: z.boolean().default(false),
  vegPrice: z.number().min(0).default(60),
  nonVegPrice: z.number().min(0).default(90),
  cutoffTime: z.string(), // ISO string date-time
  items: z.array(menuItemSchema).optional().default([]),
})

async function getAuthContext(request: Request) {
  let workspaceId = request.headers.get('x-workspace-id')
  let role = request.headers.get('x-user-role')
  let userId = request.headers.get('x-user-id')

  if (!workspaceId) {
    const auth = await requireAuth(request)
    if ('response' in auth) return auth
    workspaceId = auth.session.workspaceId
    role = auth.session.role
    userId = auth.session.userId
  }

  return { workspaceId, role, userId }
}

export async function GET(request: Request) {
  try {
    const authCtx = await getAuthContext(request)
    if ('response' in authCtx) return authCtx.response

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const config = await getWorkspaceBillingConfig(authCtx.workspaceId)

    const menus = await prisma.mealMenu.findMany({
      where: {
        workspace_id: authCtx.workspaceId,
        date: new Date(dateStr),
      },
      include: {
        items: true,
        selections: {
          include: {
            tenant: {
              include: { user: true }
            }
          }
        },
      },
      orderBy: { slot: 'asc' },
    })

    return NextResponse.json({ config, menus })
  } catch (error: any) {
    console.error('GET Meal Menu Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch meal menus' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request)
    if ('response' in authCtx) return authCtx.response

    if (authCtx.role !== 'WORKSPACE_ADMIN' && authCtx.role !== 'MANAGER' && authCtx.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin or Manager role required to publish meal menu' }, { status: 403 })
    }

    const body = await request.json()
    const validated = menuSchema.parse(body)

    const menuDate = new Date(validated.date)
    const cutoff = new Date(validated.cutoffTime)

    const menu = await prisma.mealMenu.upsert({
      where: {
        workspace_id_date_slot: {
          workspace_id: authCtx.workspaceId,
          date: menuDate,
          slot: validated.slot,
        },
      },
      update: {
        title: validated.title,
        description: validated.description,
        is_special: validated.isSpecial,
        special_tag: validated.specialTag || null,
        veg_available: validated.vegAvailable,
        non_veg_available: validated.nonVegAvailable,
        veg_price: validated.vegPrice,
        non_veg_price: validated.nonVegPrice,
        cutoff_time: cutoff,
        is_canceled: false,
        published_by_id: authCtx.userId,
      },
      create: {
        workspace_id: authCtx.workspaceId,
        date: menuDate,
        slot: validated.slot,
        title: validated.title,
        description: validated.description,
        is_special: validated.isSpecial,
        special_tag: validated.specialTag || null,
        veg_available: validated.vegAvailable,
        non_veg_available: validated.nonVegAvailable,
        veg_price: validated.vegPrice,
        non_veg_price: validated.nonVegPrice,
        cutoff_time: cutoff,
        published_by_id: authCtx.userId,
      },
    })

    // Update structured food items
    if (validated.items && validated.items.length > 0) {
      await prisma.mealMenuItem.deleteMany({ where: { menu_id: menu.id } })
      await prisma.mealMenuItem.createMany({
        data: validated.items.map((item) => ({
          workspace_id: authCtx.workspaceId,
          menu_id: menu.id,
          category: item.category,
          name: item.name,
          is_veg: item.isVeg,
        })),
      })
    }

    await recordMealAuditLog(authCtx.workspaceId, authCtx.userId, 'PUBLISH_MENU', menu.id, {
      title: menu.title,
      slot: menu.slot,
      date: validated.date,
      isSpecial: menu.is_special,
    })

    await emitMealEvent(authCtx.workspaceId, menu.is_special ? 'SPECIAL_MENU_PUBLISHED' : 'MENU_PUBLISHED', {
      menuId: menu.id,
      title: menu.title,
      slot: menu.slot,
      date: validated.date,
      specialTag: menu.special_tag,
    })

    return NextResponse.json({ message: 'Meal menu published successfully! 🍽️', menu })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Meal menu publishing error:', error)
    return NextResponse.json({ error: error.message || 'Failed to publish meal menu' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const authCtx = await getAuthContext(request)
    if ('response' in authCtx) return authCtx.response

    if (authCtx.role !== 'WORKSPACE_ADMIN' && authCtx.role !== 'MANAGER' && authCtx.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin or Manager role required to cancel meal menu' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const menuId = searchParams.get('id')
    const cancelReason = (searchParams.get('reason') || 'KITCHEN_UNAVAILABLE') as CancelReason
    const cancelNote = searchParams.get('note') || 'Staff cancelled this meal slot.'

    if (!menuId) {
      return NextResponse.json({ error: 'Menu ID is required' }, { status: 400 })
    }

    const menu = await prisma.mealMenu.update({
      where: { id: menuId },
      data: {
        is_canceled: true,
        cancel_reason: cancelReason,
        cancel_note: cancelNote,
      },
    })

    await recordMealAuditLog(authCtx.workspaceId, authCtx.userId, 'CANCEL_MENU', menu.id, {
      cancelReason,
      cancelNote,
    })

    await emitMealEvent(authCtx.workspaceId, 'MENU_CANCELLED', {
      menuId: menu.id,
      title: menu.title,
      slot: menu.slot,
      reason: cancelReason,
      note: cancelNote,
    })

    return NextResponse.json({ message: 'Meal slot cancelled successfully. 🚫', menu })
  } catch (error: any) {
    console.error('Meal menu cancellation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to cancel meal menu' }, { status: 500 })
  }
}
