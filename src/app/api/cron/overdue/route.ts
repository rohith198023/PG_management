import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  return handleOverdueProcessing(request);
}

export async function POST(request: Request) {
  return handleOverdueProcessing(request);
}

async function handleOverdueProcessing(request: Request) {
  // Check authorization if CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 });
    }
  }

  try {
    const now = new Date();

    // 1. Query issued or partially paid invoices past their due date
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        due_date: { lt: now },
        status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
      },
      include: {
        workspace: {
          include: {
            financial_settings: true,
          },
        },
        line_items: true,
      },
    });

    if (overdueInvoices.length === 0) {
      return NextResponse.json(
        { message: 'No overdue invoices found for status transition', updatedCount: 0 },
        { status: 200 }
      );
    }

    let lateFeesApplied = 0;

    for (const inv of overdueInvoices) {
      const finSettings = inv.workspace.financial_settings;
      const lateFeePerDay = finSettings ? Number(finSettings.late_fee_per_day) : 0;
      const daysOverdue = Math.max(1, Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)));

      // Check if a late fee item already exists
      const existingLateFeeItem = inv.line_items.find(item => item.description.toLowerCase().includes('late fee'));

      let addedFee = 0;
      if (lateFeePerDay > 0 && !existingLateFeeItem) {
        addedFee = lateFeePerDay * daysOverdue;
        await prisma.invoiceLineItem.create({
          data: {
            invoice_id: inv.id,
            description: `Late Fee (${daysOverdue} days overdue @ ₹${lateFeePerDay}/day)`,
            quantity: 1,
            unit_price: addedFee,
            amount: addedFee,
          },
        });
        lateFeesApplied++;
      }

      // Update invoice status and total_amount if late fee applied
      await prisma.invoice.update({
        where: { id: inv.id },
        data: {
          status: 'OVERDUE',
          ...(addedFee > 0 ? {
            total_amount: Number(inv.total_amount) + addedFee,
          } : {}),
        },
      });

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            workspace_id: inv.workspace_id,
            action: 'INVOICE_TRANSITION_OVERDUE',
            entity: 'Invoice',
            entity_id: inv.id,
            details: {
              invoiceNumber: inv.invoice_number,
              dueDate: inv.due_date,
              daysOverdue,
              lateFeeApplied: addedFee,
            },
          },
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${overdueInvoices.length} overdue invoices (${lateFeesApplied} late fees applied)`,
      processedCount: overdueInvoices.length,
      lateFeesApplied,
    });
  } catch (error: any) {
    console.error('Overdue Cron Engine Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process overdue invoices' }, { status: 500 });
  }
}
