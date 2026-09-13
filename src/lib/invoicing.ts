import { prisma } from '@/lib/prisma'
import { InvoiceStatus, LeaseStatus } from '@prisma/client'

/**
 * Generates a unique, workspace-scoped sequential invoice number: INV-YYYYMM-XXXX
 */
export async function generateInvoiceNumber(tx: any, workspaceId: string): Promise<string> {
  const date = new Date()
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  const prefix = `INV-${yearMonth}-`

  // Find latest invoice number for this workspace in current month
  const latestInvoice = await tx.invoice.findFirst({
    where: {
      workspace_id: workspaceId,
      invoice_number: { startsWith: prefix },
    },
    orderBy: { invoice_number: 'desc' },
    select: { invoice_number: true },
  })

  let sequence = 1
  if (latestInvoice && latestInvoice.invoice_number) {
    const parts = latestInvoice.invoice_number.split('-')
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`
}

/**
 * Calculates prorated rent if lease start date is within the target billing month.
 */
export function calculateProratedRent(
  monthlyRent: number,
  leaseStartDate: Date,
  targetDate: Date
): { amount: number; isProrated: boolean; daysActive: number; totalDaysInMonth: number } {
  const year = targetDate.getFullYear()
  const month = targetDate.getMonth()

  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0)
  const totalDaysInMonth = endOfMonth.getDate()

  const leaseStart = new Date(leaseStartDate)

  // If lease started before or on the 1st of this month -> full rent
  if (leaseStart <= startOfMonth) {
    return {
      amount: monthlyRent,
      isProrated: false,
      daysActive: totalDaysInMonth,
      totalDaysInMonth,
    }
  }

  // If lease started after the end of this month -> 0 rent
  if (leaseStart > endOfMonth) {
    return {
      amount: 0,
      isProrated: true,
      daysActive: 0,
      totalDaysInMonth,
    }
  }

  // Lease started mid-month
  const daysActive = totalDaysInMonth - leaseStart.getDate() + 1
  const proratedAmount = Math.round((monthlyRent / totalDaysInMonth) * daysActive * 100) / 100

  return {
    amount: proratedAmount,
    isProrated: true,
    daysActive,
    totalDaysInMonth,
  }
}

/**
 * Creates a recurring invoice for an active lease and posts the corresponding General Ledger entry.
 */
export async function createRecurringInvoiceForLease(
  tx: any,
  workspaceId: string,
  lease: any,
  issueDate: Date = new Date(),
  dueDateDays: number = 7
) {
  const rentAmount = Number(lease.rent_amount)
  const prorateInfo = calculateProratedRent(rentAmount, lease.start_date, issueDate)

  if (prorateInfo.amount <= 0) {
    return null // Skip if lease start is in future
  }

  const invoiceNumber = await generateInvoiceNumber(tx, workspaceId)

  // Calculate Due Date
  const dueDate = new Date(issueDate)
  dueDate.setDate(dueDate.getDate() + dueDateDays)

  const subtotal = prorateInfo.amount
  const taxAmount = 0 // Rent is tax-exempt for residential tenancy in default rule
  const totalAmount = subtotal + taxAmount

  // Create Invoice Record
  const invoice = await tx.invoice.create({
    data: {
      workspace_id: workspaceId,
      tenant_id: lease.tenant_id,
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: dueDate,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      amount_paid: 0,
      status: 'ISSUED',
      line_items: {
        create: [
          {
            description: prorateInfo.isProrated
              ? `Monthly Rent (Prorated ${prorateInfo.daysActive}/${prorateInfo.totalDaysInMonth} Days)`
              : `Monthly Room Rent`,
            quantity: 1,
            unit_price: subtotal,
            amount: subtotal,
          },
        ],
      },
    },
    include: {
      line_items: true,
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

  // Fetch Accounts Receivable (1200) and Rental Revenue (4010) accounts
  const arAccount = await tx.ledgerAccount.findFirst({
    where: { workspace_id: workspaceId, code: '1200' },
  })

  const revAccount = await tx.ledgerAccount.findFirst({
    where: { workspace_id: workspaceId, code: '4010' },
  })

  // Post Double-Entry Journal Entry if accounts exist
  if (arAccount && revAccount) {
    // Debit Accounts Receivable (Asset increases)
    await tx.ledgerJournalEntry.create({
      data: {
        workspace_id: workspaceId,
        account_id: arAccount.id,
        reference_id: invoice.id,
        debit_amount: totalAmount,
        credit_amount: 0,
        description: `Invoice ${invoiceNumber} Issued - Accounts Receivable`,
        posted_at: issueDate,
      },
    })

    // Credit Rental Revenue (Revenue increases)
    await tx.ledgerJournalEntry.create({
      data: {
        workspace_id: workspaceId,
        account_id: revAccount.id,
        reference_id: invoice.id,
        debit_amount: 0,
        credit_amount: totalAmount,
        description: `Invoice ${invoiceNumber} Issued - Rental Revenue`,
        posted_at: issueDate,
      },
    })
  }

  // Multi-Channel Automated Notification Enqueue
  try {
    const tenantUser = invoice.tenant?.user
    if (tenantUser) {
      const monthStr = issueDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      const dueDateStr = dueDate.toISOString().split('T')[0]
      const recipientName = `${tenantUser.first_name || ''} ${tenantUser.last_name || ''}`.trim() || 'Resident'
      const target = tenantUser.email || tenantUser.phone || 'resident@pg.com'

      // Enqueue Email Notification
      await (tx as any).notificationQueue.create({
        data: {
          workspace_id: workspaceId,
          recipient_id: tenantUser.id,
          channel: 'EMAIL',
          type: 'INVOICE_ISSUED',
          target: tenantUser.email || target,
          subject: `Invoice ${invoiceNumber} Generated for ${monthStr}`,
          rendered_body: `Hello ${recipientName}, your rent invoice ${invoiceNumber} for ${monthStr} (₹${totalAmount}) is due on ${dueDateStr}.`,
          payload_json: {
            workspaceId,
            recipientId: tenantUser.id,
            recipientName,
            target: tenantUser.email || target,
            invoiceNumber,
            amount: totalAmount,
            dueDate: dueDateStr,
            month: monthStr,
            paymentUrl: `/tenant/invoices`,
          },
          status: 'PENDING',
          attempts: 0,
          max_retries: 3,
        },
      })

      // Enqueue In-App Alert
      await (tx as any).notificationQueue.create({
        data: {
          workspace_id: workspaceId,
          recipient_id: tenantUser.id,
          channel: 'IN_APP',
          type: 'INVOICE_ISSUED',
          target: tenantUser.id,
          subject: `New Invoice ${invoiceNumber}`,
          rendered_body: `Your rent invoice for ${monthStr} of ₹${totalAmount} has been generated. Due: ${dueDateStr}.`,
          payload_json: {
            workspaceId,
            recipientId: tenantUser.id,
            recipientName,
            target: tenantUser.id,
            invoiceNumber,
            amount: totalAmount,
            dueDate: dueDateStr,
            month: monthStr,
            paymentUrl: `/tenant/invoices`,
          },
          status: 'PENDING',
          attempts: 0,
          max_retries: 3,
        },
      })
    }
  } catch (notifErr) {
    console.error('Failed to enqueue invoice notification:', notifErr)
  }

  return invoice
}

