import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { generateInvoiceNumber } from '@/lib/invoicing'
import { z } from 'zod'

const createManualInvoiceSchema = z.object({
  tenantId: z.string().uuid(),
  description: z.string().min(2),
  amount: z.number().positive(),
  dueDateDays: z.number().default(7),
})

// GET /api/invoices — List workspace invoices
export async function GET(request: Request) {
  try {
    const authResult = await requireRole(request, ['WORKSPACE_ADMIN', 'MANAGER', 'STAFF'])
    if ('response' in authResult) return authResult.response

    const { session } = authResult
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tenantId = searchParams.get('tenantId')

    const whereClause: any = {
      workspace_id: session.workspaceId,
      deleted_at: null,
    }

    if (status) {
      whereClause.status = status
    }
    if (tenantId) {
      whereClause.tenant_id = tenantId
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        line_items: true,
        tenant: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone: true,
              },
            },
            bed: {
              include: {
                room: {
                  include: {
                    property: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
        payments: {
          where: { status: 'PAID' },
          select: {
            id: true,
            amount: true,
            payment_date: true,
            source: true,
            transaction_ref: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    // Compute metrics summary
    const totalIssued = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0)
    const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid), 0)
    const totalPending = totalIssued - totalPaid

    return NextResponse.json(
      {
        invoices,
        metrics: {
          count: invoices.length,
          totalIssued,
          totalPaid,
          totalPending,
          collectionRate: totalIssued > 0 ? Math.round((totalPaid / totalIssued) * 100) : 0,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Fetch Invoices Error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

// POST /api/invoices — Manual single custom invoice creation
export async function POST(request: Request) {
  try {
    const authResult = await requireRole(request, ['WORKSPACE_ADMIN', 'MANAGER'])
    if ('response' in authResult) return authResult.response

    const { session } = authResult
    const body = await request.json()
    const validated = createManualInvoiceSchema.parse(body)

    const issueDate = new Date()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + validated.dueDateDays)

    const result = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await generateInvoiceNumber(tx, session.workspaceId)

      const invoice = await tx.invoice.create({
        data: {
          workspace_id: session.workspaceId,
          tenant_id: validated.tenantId,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate,
          subtotal: validated.amount,
          tax_amount: 0,
          total_amount: validated.amount,
          amount_paid: 0,
          status: 'ISSUED',
          line_items: {
            create: [
              {
                description: validated.description,
                quantity: 1,
                unit_price: validated.amount,
                amount: validated.amount,
              },
            ],
          },
        },
        include: {
          line_items: true,
          tenant: {
            include: { user: true },
          },
        },
      })

      // Post General Ledger journal entry
      const arAccount = await tx.ledgerAccount.findFirst({
        where: { workspace_id: session.workspaceId, code: '1200' },
      })
      const revAccount = await tx.ledgerAccount.findFirst({
        where: { workspace_id: session.workspaceId, code: '4010' },
      })

      if (arAccount && revAccount) {
        await tx.ledgerJournalEntry.create({
          data: {
            workspace_id: session.workspaceId,
            account_id: arAccount.id,
            reference_id: invoice.id,
            debit_amount: validated.amount,
            credit_amount: 0,
            description: `Manual Invoice ${invoiceNumber} - ${validated.description}`,
          },
        })

        await tx.ledgerJournalEntry.create({
          data: {
            workspace_id: session.workspaceId,
            account_id: revAccount.id,
            reference_id: invoice.id,
            debit_amount: 0,
            credit_amount: validated.amount,
            description: `Manual Invoice ${invoiceNumber} Revenue`,
          },
        })
      }

      return invoice
    })

    return NextResponse.json({ message: 'Custom invoice created successfully', invoice: result }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create Manual Invoice Error:', error)
    return NextResponse.json({ error: 'Failed to create custom invoice' }, { status: 500 })
  }
}
