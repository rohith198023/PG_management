import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id')
  const workspaceId = request.headers.get('x-workspace-id')

  if (!userId || !workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      workspace_id: workspaceId,
      deleted_at: null,
    },
    include: {
      workspace: true,
      tenant_profile: {
        include: {
          bed: {
            include: {
              room: {
                include: {
                  property: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User context not found' }, { status: 404 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      tenantProfile: user.tenant_profile,
    },
    workspace: {
      id: user.workspace.id,
      name: user.workspace.name,
      slug: user.workspace.slug,
      logoUrl: user.workspace.logo_url,
      gstNumber: user.workspace.gst_number,
    },
  })
}
