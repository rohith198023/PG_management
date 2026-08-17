import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordMealAuditLog, emitMealEvent } from '@/lib/mess/mess_engine'
import { DayOfWeek } from '@prisma/client'
import { requireAuth } from '@/lib/rbac'

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

const DAY_MAP: Record<number, DayOfWeek> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
}

const DEFAULT_CUTOFF_HOURS: Record<string, number> = {
  BREAKFAST: 22, // 10 PM night before
  LUNCH: 9,      // 9 AM same day
  DINNER: 17,    // 5 PM same day
  SNACKS: 15,    // 3 PM same day
}

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request)
    if ('response' in authCtx) return authCtx.response

    if (authCtx.role !== 'WORKSPACE_ADMIN' && authCtx.role !== 'MANAGER' && authCtx.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin or Manager role required' }, { status: 403 })
    }

    const body = await request.json()
    const { startDate, daysCount = 7 } = body

    const template = await prisma.mealWeeklyTemplate.findFirst({
      where: { workspace_id: authCtx.workspaceId, is_active: true },
      include: { items: true },
    })

    if (!template || template.items.length === 0) {
      return NextResponse.json({ error: 'No items in active weekly template. Please configure template first.' }, { status: 400 })
    }

    const start = new Date(startDate || new Date().toISOString().split('T')[0])
    let createdCount = 0

    for (let i = 0; i < daysCount; i++) {
      const curDate = new Date(start)
      curDate.setDate(curDate.getDate() + i)
      const dayOfWeek = DAY_MAP[curDate.getDay()]

      const templateItemsForDay = template.items.filter((item) => item.day_of_week === dayOfWeek)

      for (const tItem of templateItemsForDay) {
        // Calculate default cutoff datetime
        const cutoff = new Date(curDate)
        if (tItem.slot === 'BREAKFAST') {
          cutoff.setDate(cutoff.getDate() - 1)
          cutoff.setHours(22, 0, 0, 0)
        } else {
          const hour = DEFAULT_CUTOFF_HOURS[tItem.slot] || 9
          cutoff.setHours(hour, 0, 0, 0)
        }

        const menu = await prisma.mealMenu.upsert({
          where: {
            workspace_id_date_slot: {
              workspace_id: authCtx.workspaceId,
              date: curDate,
              slot: tItem.slot,
            },
          },
          update: {
            title: tItem.title,
            description: tItem.description,
            is_special: tItem.is_special,
            special_tag: tItem.special_tag,
            veg_available: tItem.veg_available,
            non_veg_available: tItem.non_veg_available,
            veg_price: tItem.veg_price,
            non_veg_price: tItem.non_veg_price,
            published_by_id: authCtx.userId,
          },
          create: {
            workspace_id: authCtx.workspaceId,
            date: curDate,
            slot: tItem.slot,
            title: tItem.title,
            description: tItem.description,
            is_special: tItem.is_special,
            special_tag: tItem.special_tag,
            veg_available: tItem.veg_available,
            non_veg_available: tItem.non_veg_available,
            veg_price: tItem.veg_price,
            non_veg_price: tItem.non_veg_price,
            cutoff_time: cutoff,
            published_by_id: authCtx.userId,
          },
        })

        // Add structured items if specified in template
        if (Array.isArray(tItem.items_json)) {
          await prisma.mealMenuItem.deleteMany({ where: { menu_id: menu.id } })
          for (const rawItem of tItem.items_json as any[]) {
            if (rawItem.name) {
              await prisma.mealMenuItem.create({
                data: {
                  workspace_id: authCtx.workspaceId,
                  menu_id: menu.id,
                  category: rawItem.category || 'MAIN_ITEM',
                  name: rawItem.name,
                  is_veg: rawItem.isVeg ?? true,
                },
              })
            }
          }
        }

        createdCount++
      }
    }

    await recordMealAuditLog(authCtx.workspaceId, authCtx.userId, 'APPLY_WEEKLY_TEMPLATE', null, {
      startDate,
      daysCount,
      createdCount,
    })

    await emitMealEvent(authCtx.workspaceId, 'WEEKLY_TEMPLATE_APPLIED', {
      startDate,
      daysCount,
      createdCount,
    })

    return NextResponse.json({
      message: `Successfully populated ${createdCount} meal slots for ${daysCount} days from template! 🗓️`,
      createdCount,
    })
  } catch (error: any) {
    console.error('Apply Template Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to apply weekly template' }, { status: 500 })
  }
}
