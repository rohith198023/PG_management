import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'

// ── POST: Toggle workspace suspension ────────────────────────────────────────
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req)
    if ('response' in auth) return auth.response

    if (auth.session.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super-Admin access required' }, { status: 403 })
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, is_active: true },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const newStatus = !workspace.is_active

    await prisma.workspace.update({
      where: { id: params.id },
      data: { is_active: newStatus },
    })

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        workspace_id: params.id,
        user_id: auth.session.userId,
        action: newStatus ? 'WORKSPACE_REACTIVATED' : 'WORKSPACE_SUSPENDED',
        entity: 'Workspace',
        entity_id: params.id,
        details: {
          performedBy: auth.session.email,
          newStatus: newStatus ? 'ACTIVE' : 'SUSPENDED',
          workspaceName: workspace.name,
        },
      },
    })

    return NextResponse.json({
      message: `Workspace ${newStatus ? 'reactivated' : 'suspended'} successfully`,
      is_active: newStatus,
    })
  } catch (error: any) {
    console.error('Super-Admin suspend/reactivate error:', error)
    return NextResponse.json({ error: error.message || 'Failed to toggle workspace status' }, { status: 500 })
  }
}
