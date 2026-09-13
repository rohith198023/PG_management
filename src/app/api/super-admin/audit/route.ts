import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'

// ── GET: Global audit log stream (paginated, all workspaces) ─────────────────
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if ('response' in auth) return auth.response

    if (auth.session.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super-Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))
    const action = searchParams.get('action') || undefined
    const workspaceId = searchParams.get('workspaceId') || undefined

    const where: any = {}
    if (action) where.action = { contains: action, mode: 'insensitive' }
    if (workspaceId) where.workspace_id = workspaceId

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          workspace: { select: { name: true, slug: true } },
          user: { select: { first_name: true, last_name: true, email: true, role: true } },
        },
      }),
    ])

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Super-Admin audit log error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch audit logs' }, { status: 500 })
  }
}
