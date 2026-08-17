import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'

export async function GET(request: Request) {
  try {
    const authResult = await requireRole(request, ['TENANT'])
    if (authResult.error) return authResult.response

    const { session } = authResult

    // Find TenantProfile for current user
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { user_id: session.userId },
      include: {
        bed: {
          include: {
            room: {
              include: {
                property: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    if (!tenantProfile) {
      return NextResponse.json({ error: 'Tenant profile not found' }, { status: 404 })
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        workspace_id: session.workspaceId,
        tenant_id: tenantProfile.id,
        deleted_at: null,
      },
      include: {
        line_items: true,
        payments: {
          select: {
            id: true,
            amount: true,
            payment_date: true,
            status: true,
            source: true,
            transaction_ref: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ invoices, tenant: tenantProfile }, { status: 200 })
  } catch (error: any) {
    console.error('Fetch Tenant Invoices Error:', error)
    return NextResponse.json({ error: 'Failed to fetch tenant invoices' }, { status: 500 })
  }
}
