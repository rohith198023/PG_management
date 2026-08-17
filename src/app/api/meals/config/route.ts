import { NextResponse } from 'next/server'
import { dbGetMealBillingConfig, dbUpsertMealBillingConfig } from '@/lib/mess/mess_db'
import { recordMealAuditLog } from '@/lib/mess/mess_engine'
import { resolveWorkspaceContext } from '@/lib/workspace-context'

export async function GET(request: Request) {
  try {
    const ctx = await resolveWorkspaceContext(request)
    if (!ctx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
    }

    const config = await dbGetMealBillingConfig(ctx.workspaceId)
    return NextResponse.json({ config })
  } catch (error: any) {
    console.error('GET Meal Config Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch meal config' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveWorkspaceContext(request)
    if (!ctx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
    }

    if (ctx.role !== 'WORKSPACE_ADMIN' && ctx.role !== 'MANAGER' && ctx.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin or Manager role required' }, { status: 403 })
    }

    const body = await request.json()
    const { billingType, monthlyPlanPrice, defaultVegPrice, defaultNonVegPrice, timezone } = body

    const config = await dbUpsertMealBillingConfig(
      ctx.workspaceId,
      billingType,
      Number(monthlyPlanPrice ?? 3500),
      Number(defaultVegPrice ?? 60),
      Number(defaultNonVegPrice ?? 90),
      timezone || 'Asia/Kolkata'
    )

    await recordMealAuditLog(ctx.workspaceId, ctx.userId || '', 'UPDATE_BILLING_CONFIG', null, {
      billingType,
      monthlyPlanPrice,
      defaultVegPrice,
      defaultNonVegPrice,
    })

    return NextResponse.json({ message: 'Meal billing policy updated successfully! ⚙️', config })
  } catch (error: any) {
    console.error('POST Meal Config Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update meal config' }, { status: 500 })
  }
}
