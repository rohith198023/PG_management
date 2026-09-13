import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'

// ── GET: Single workspace detail ─────────────────────────────────────────────
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req)
    if ('response' in auth) return auth.response

    if (auth.session.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super-Admin access required' }, { status: 403 })
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      include: {
        subscription: true,
        _count: {
          select: {
            users: { where: { deleted_at: null } },
            beds: { where: { deleted_at: null } },
            tenants: { where: { deleted_at: null } },
            properties: { where: { deleted_at: null } },
            invoices: { where: { deleted_at: null } },
          },
        },
      },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Recent audit logs
    const recentAuditLogs = await prisma.auditLog.findMany({
      where: { workspace_id: params.id },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: { user: { select: { first_name: true, last_name: true, email: true } } },
    })

    return NextResponse.json({ workspace, recentAuditLogs })
  } catch (error: any) {
    console.error('Super-Admin GET workspace[id] error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch workspace' }, { status: 500 })
  }
}

// ── PATCH: Update workspace subscription tier ────────────────────────────────
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req)
    if ('response' in auth) return auth.response

    if (auth.session.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super-Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { planName, maxBeds, maxProperties, maxStaffUsers, isTrial, notes, mrrAmount } = body

    const subscriptionUpdate: any = {}
    if (planName) subscriptionUpdate.plan_name = planName
    if (maxBeds !== undefined) subscriptionUpdate.max_beds = maxBeds
    if (maxProperties !== undefined) subscriptionUpdate.max_properties = maxProperties
    if (maxStaffUsers !== undefined) subscriptionUpdate.max_staff_users = maxStaffUsers
    if (isTrial !== undefined) subscriptionUpdate.is_trial = isTrial
    if (notes !== undefined) subscriptionUpdate.notes = notes
    if (mrrAmount !== undefined) subscriptionUpdate.mrr_amount = mrrAmount

    const updatedSub = await prisma.workspaceSubscription.upsert({
      where: { workspace_id: params.id },
      update: subscriptionUpdate,
      create: {
        workspace_id: params.id,
        ...subscriptionUpdate,
      },
    })

    return NextResponse.json({ message: 'Subscription updated', subscription: updatedSub })
  } catch (error: any) {
    console.error('Super-Admin PATCH workspace[id] error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update workspace' }, { status: 500 })
  }
}
