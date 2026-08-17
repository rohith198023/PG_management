import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processAtomicMealSelection } from '@/lib/mess/mess_engine'
import { MealOption } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '@/lib/rbac'

const selectionSchema = z.object({
  menuId: z.string().uuid(),
  choice: z.nativeEnum(MealOption),
})

async function getAuthContext(request: Request) {
  let workspaceId = request.headers.get('x-workspace-id')
  let role = request.headers.get('x-user-role')
  let userId = request.headers.get('x-user-id')

  if (!workspaceId || !userId) {
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

    const tenantProfile = await prisma.tenantProfile.findFirst({
      where: { user_id: authCtx.userId, workspace_id: authCtx.workspaceId },
    })

    if (!tenantProfile) {
      return NextResponse.json({ selections: [] })
    }

    const selections = await prisma.mealSelection.findMany({
      where: {
        workspace_id: authCtx.workspaceId,
        tenant_id: tenantProfile.id,
        menu: {
          date: new Date(dateStr),
        },
      },
      include: { menu: true },
    })

    return NextResponse.json({ selections })
  } catch (error: any) {
    console.error('GET Meal Selection Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch meal selections' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request)
    if ('response' in authCtx) return authCtx.response

    const body = await request.json()
    const validated = selectionSchema.parse(body)

    let tenantProfile = await prisma.tenantProfile.findFirst({
      where: { user_id: authCtx.userId, workspace_id: authCtx.workspaceId },
    })

    if (!tenantProfile) {
      tenantProfile = await prisma.tenantProfile.findFirst({
        where: { workspace_id: authCtx.workspaceId },
      })
    }

    if (!tenantProfile) {
      return NextResponse.json({ error: 'Tenant profile not found for this user.' }, { status: 404 })
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    const result = await processAtomicMealSelection({
      workspaceId: authCtx.workspaceId,
      userId: authCtx.userId,
      menuId: validated.menuId,
      tenantId: tenantProfile.id,
      choice: validated.choice,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      message: `Meal choice updated to ${validated.choice}! 🍱`,
      selection: result.selection,
      netDifferential: result.netDifferential,
      journalEntriesPosted: result.journalEntriesPosted,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    const statusCode = error.statusCode || 500
    console.error('Submit Meal Selection Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to submit meal selection' }, { status: statusCode })
  }
}
