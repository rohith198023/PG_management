import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createRecurringInvoiceForLease } from '@/lib/invoicing'

export async function POST(request: Request) {
  try {
    const authResult = await requireRole(request, ['WORKSPACE_ADMIN', 'MANAGER'])
    if ('response' in authResult) return authResult.response

    const { session } = authResult
    const workspaceId = session.workspaceId

    const issueDate = new Date()
    const startOfMonth = new Date(issueDate.getFullYear(), issueDate.getMonth(), 1)
    const endOfMonth = new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 0)

    // Fetch all active leases in the workspace
    const activeLeases = await prisma.lease.findMany({
      where: {
        workspace_id: workspaceId,
        status: 'ACTIVE',
        deleted_at: null,
      },
      include: {
        tenant: {
          include: {
            user: true,
            bed: {
              include: {
                room: true,
              },
            },
          },
        },
      },
    })

    if (activeLeases.length === 0) {
      return NextResponse.json(
        { message: 'No active leases found for recurring invoice generation', generatedCount: 0, totalBilled: 0 },
        { status: 200 }
      )
    }

    const generatedInvoices: any[] = []
    let totalBilled = 0

    // Execute recurring billing in transaction
    await prisma.$transaction(async (tx) => {
      for (const lease of activeLeases) {
        // Idempotency check: check if invoice was already generated for this tenant in current month
        const existingInvoice = await tx.invoice.findFirst({
          where: {
            workspace_id: workspaceId,
            tenant_id: lease.tenant_id,
            issue_date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
            status: { not: 'CANCELLED' },
          },
        })

        if (existingInvoice) {
          continue // Already billed for this billing cycle
        }

        const invoice = await createRecurringInvoiceForLease(tx, workspaceId, lease, issueDate)
        if (invoice) {
          generatedInvoices.push(invoice)
          totalBilled += Number(invoice.total_amount)
        }
      }
    })

    return NextResponse.json(
      {
        message: `Successfully generated ${generatedInvoices.length} recurring rent invoices`,
        generatedCount: generatedInvoices.length,
        totalBilled,
        invoices: generatedInvoices,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Recurring Invoice Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate recurring invoices' }, { status: 500 })
  }
}
