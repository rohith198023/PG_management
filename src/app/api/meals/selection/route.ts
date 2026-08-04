import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MealOption } from '@prisma/client'
import { z } from 'zod'

const selectionSchema = z.object({
  menuId: z.string().uuid(),
  choice: z.nativeEnum(MealOption),
})

export async function POST(request: Request) {
  const workspaceId = request.headers.get('x-workspace-id')
  const userId = request.headers.get('x-user-id')

  if (!workspaceId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = selectionSchema.parse(body)

    // Get tenant profile
    const tenant = await prisma.tenantProfile.findUnique({
      where: { user_id: userId },
    })

    if (!tenant || tenant.workspace_id !== workspaceId) {
      return NextResponse.json({ error: 'Forbidden: Tenant profile not found for active workspace' }, { status: 403 })
    }

    // Get meal menu record
    const menu = await prisma.mealMenu.findFirst({
      where: {
        id: validated.menuId,
        workspace_id: workspaceId,
      },
    })

    if (!menu) {
      return NextResponse.json({ error: 'Meal menu not found' }, { status: 404 })
    }

    if (menu.is_canceled) {
      return NextResponse.json({ error: 'This meal slot has been marked unavailable by administration' }, { status: 400 })
    }

    // ENFORCE CUTOFF TIME SERVER-SIDE (Section 5 Rule)
    const now = new Date()
    if (now > new Date(menu.cutoff_time)) {
      return NextResponse.json(
        { error: 'Selection locked: Cutoff time for this meal has passed' },
        { status: 400 }
      )
    }

    // Validate non-veg availability if selected
    if (validated.choice === 'NON_VEG' && !menu.non_veg_available) {
      return NextResponse.json({ error: 'Non-veg is not available for this meal slot' }, { status: 400 })
    }

    // Determine charge
    let chargedAmount = 0
    if (validated.choice === 'VEG') {
      chargedAmount = Number(menu.veg_price)
    } else if (validated.choice === 'NON_VEG') {
      chargedAmount = Number(menu.non_veg_price)
    }

    // Save or update selection record
    const selection = await prisma.mealSelection.upsert({
      where: {
        menu_id_tenant_id: {
          menu_id: menu.id,
          tenant_id: tenant.id,
        },
      },
      update: {
        choice: validated.choice,
        charged_amount: chargedAmount,
      },
      create: {
        workspace_id: workspaceId,
        menu_id: menu.id,
        tenant_id: tenant.id,
        choice: validated.choice,
        charged_amount: chargedAmount,
      },
    })

    return NextResponse.json({
      message: 'Meal choice updated successfully',
      selection,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Meal selection error:', error)
    return NextResponse.json({ error: 'Failed to record meal selection' }, { status: 500 })
  }
}
