import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveWorkspaceContext } from '@/lib/workspace-context'


export async function GET(request: Request) {
  try {
    const authCtx = await resolveWorkspaceContext(request)
    if (!authCtx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const targetDate = new Date(dateStr)

    // Total eligible active occupied tenants in workspace on targetDate
    const activeTenants = await prisma.tenantProfile.findMany({
      where: {
        workspace_id: authCtx.workspaceId,
        user: { is_active: true },
        bed_id: { not: null },
        leases: {
          some: {
            status: 'ACTIVE',
            start_date: { lte: targetDate },
            OR: [
              { end_date: null },
              { end_date: { gte: targetDate } },
            ],
          },
        },
      },
      include: {
        user: true,
        bed: {
          include: {
            room: {
              include: { floor: { include: { property: true } } },
            },
          },
        },
      },
    })

    const totalActiveTenantsCount = activeTenants.length

    // Published menus for target date
    let menus: any[] = []
    try {
      if ((prisma as any).mealMenu?.findMany) {
        menus = await (prisma as any).mealMenu.findMany({
          where: {
            workspace_id: authCtx.workspaceId,
            date: targetDate,
          },
          include: {
            items: true,
            selections: true,
          },
          orderBy: { slot: 'asc' },
        })
      }
    } catch (e) {
      console.warn('Prisma delegate mealMenu.findMany failed in headcount, using SQL fallback...', e)
      menus = await prisma.$queryRaw`
        SELECT * FROM "MealMenu" WHERE workspace_id = ${authCtx.workspaceId}::uuid AND date = ${targetDate}::date ORDER BY slot ASC;
      `
      for (const m of menus) {
        m.items = await prisma.$queryRaw`SELECT * FROM "MealMenuItem" WHERE menu_id = ${m.id}::uuid;`
        m.selections = await prisma.$queryRaw`SELECT * FROM "MealSelection" WHERE menu_id = ${m.id}::uuid;`
      }
    }

    const summaryBySlot: Record<string, any> = {}

    for (const slotName of ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS']) {
      const menu = menus.find((m) => m.slot === slotName)

      if (!menu) {
        summaryBySlot[slotName] = {
          isPublished: false,
          menu: null,
          headcount: { veg: 0, nonVeg: 0, skip: 0, unselected: totalActiveTenantsCount, totalExpected: 0 },
          roster: [],
        }
        continue
      }

      const selections = menu.selections
      let vegCount = 0
      let nonVegCount = 0
      let skipCount = 0

      const selectedTenantIds = new Set<string>()

      const roster = activeTenants.map((t) => {
        const sel = selections.find((s) => s.tenant_id === t.id)
        let choice = 'UNSELECTED'

        if (sel) {
          selectedTenantIds.add(t.id)
          choice = sel.choice
          if (sel.choice === 'VEG') vegCount++
          else if (sel.choice === 'NON_VEG') nonVegCount++
          else if (sel.choice === 'SKIP') skipCount++
        }

        const roomName = t.bed?.room?.room_number ? `Room ${t.bed.room.room_number}` : 'Unassigned'
        const bedCode = t.bed?.bed_code || 'Bed'

        return {
          tenantId: t.id,
          name: `${t.user.first_name} ${t.user.last_name}`,
          phone: t.user.phone,
          room: roomName,
          bed: bedCode,
          choice,
          updatedAt: sel?.updated_at || null,
        }
      })

      const unselectedCount = totalActiveTenantsCount - selectedTenantIds.size

      summaryBySlot[slotName] = {
        isPublished: true,
        menu: {
          id: menu.id,
          title: menu.title,
          description: menu.description,
          isSpecial: menu.is_special,
          specialTag: menu.special_tag,
          cutoffTime: menu.cutoff_time,
          isCanceled: menu.is_canceled,
          cancelReason: menu.cancel_reason,
          cancelNote: menu.cancel_note,
          items: menu.items,
        },
        headcount: {
          veg: menu.is_canceled ? 0 : vegCount,
          nonVeg: menu.is_canceled ? 0 : nonVegCount,
          skip: menu.is_canceled ? totalActiveTenantsCount : skipCount,
          unselected: menu.is_canceled ? 0 : unselectedCount,
          totalExpected: menu.is_canceled ? 0 : vegCount + nonVegCount,
          totalTenants: totalActiveTenantsCount,
        },
        roster: menu.is_canceled ? [] : roster,
      }
    }

    return NextResponse.json({
      date: dateStr,
      totalTenants: totalActiveTenantsCount,
      summary: summaryBySlot,
    })
  } catch (error: any) {
    console.error('GET Meal Headcount Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch kitchen headcount report' }, { status: 500 })
  }
}
