import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveWorkspaceContext } from '@/lib/workspace-context'

export async function GET(request: Request) {
  const ctx = await resolveWorkspaceContext(request)

  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
  }

  try {
    const tenants = await prisma.tenantProfile.findMany({
      where: {
        workspace_id: ctx.workspaceId,
        deleted_at: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            is_active: true,
            created_at: true,
          },
        },
        bed: {
          include: {
            room: {
              include: {
                property: true,
              },
            },
          },
        },
        leases: {
          where: { status: 'ACTIVE' },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ tenants })
  } catch (error: any) {
    console.error('GET Tenants Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch tenants' }, { status: 500 })
  }
}
