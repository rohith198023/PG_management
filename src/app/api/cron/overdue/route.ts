import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const now = new Date()

    // Query issued or partially paid invoices past their due date
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        due_date: { lt: now },
        status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
        deleted_at: null,
      },
    })

    if (overdueInvoices.length === 0) {
      return NextResponse.json(
        { message: 'No overdue invoices found for status transition', updatedCount: 0 },
        { status: 200 }
      )
    }

    const updatedIds = overdueInvoices.map((inv) => inv.id)

    // Update statuses to OVERDUE
    await prisma.invoice.updateMany({
      where: { id: { in: updatedIds } },
      data: { status: 'OVERDUE' },
    })

    // Record audit log
    for (const inv of overdueInvoices) {
      await prisma.auditLog.create({
        data: {
          workspace_id: inv.workspace_id,
          action: 'INVOICE_TRANSITION_OVERDUE',
          entity: 'Invoice',
          entity_id: inv.id,
          details: {
            invoiceNumber: inv.invoice_number,
            dueDate: inv.due_date,
            previousStatus: inv.status,
          },
        },
      })
    }

    return NextResponse.json(
      {
        message: `Successfully updated ${overdueInvoices.length} invoices to OVERDUE status`,
        updatedCount: overdueInvoices.length,
        invoiceIds: updatedIds,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Overdue Cron Engine Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to process overdue invoice transitions' }, { status: 500 })
  }
}
