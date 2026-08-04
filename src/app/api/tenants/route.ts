import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const workspaceId = request.headers.get('x-workspace-id')
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
  }

  const tenants = await prisma.tenantProfile.findMany({
    where: {
      workspace_id: workspaceId,
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
}
