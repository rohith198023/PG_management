import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { z } from 'zod';
import { postLedgerEntry } from '@/lib/ledger/posting';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

const moveOutSchema = z.object({
  moveOutDate: z.string().optional(),
  damageDeduction: z.number().nonnegative().default(0),
  deductionNotes: z.string().optional(),
  refundMethod: z.enum(['BANK_TRANSFER', 'UPI', 'CASH', 'ADJUSTED']).default('BANK_TRANSFER'),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRole(request, ['WORKSPACE_ADMIN', 'MANAGER', 'PLATFORM_SUPER_ADMIN']);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const tenantId = params.id;
    const body = await request.json().catch(() => ({}));
    const { damageDeduction, deductionNotes, refundMethod } = moveOutSchema.parse(body);

    // 1. Fetch tenant with active lease, bed, and open invoices
    const tenant = await prisma.tenantProfile.findFirst({
      where: {
        id: tenantId,
        workspace_id: workspaceId,
        deleted_at: null,
      },
      include: {
        user: true,
        bed: {
          include: {
            room: {
              include: { property: true },
            },
          },
        },
        leases: {
          where: { status: 'ACTIVE' },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        invoices: {
          where: {
            status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found in this workspace' }, { status: 404 });
    }

    const activeLease = tenant.leases[0];
    if (!activeLease) {
      return NextResponse.json({ error: 'Tenant does not have an active lease' }, { status: 400 });
    }

    // 2. Calculate financial settlement
    let totalUnpaidDues = 0;
    for (const inv of tenant.invoices) {
      const remaining = Number(inv.total_amount) - Number(inv.amount_paid);
      if (remaining > 0) totalUnpaidDues += remaining;
    }

    const depositAmount = Number(activeLease.deposit_amount) || 0;
    const totalDeductions = totalUnpaidDues + damageDeduction;
    const netRefundable = Math.max(0, depositAmount - totalDeductions);
    const balanceOwedByTenant = Math.max(0, totalDeductions - depositAmount);

    const now = new Date();

    // 3. Execute atomic move-out transaction
    await prisma.$transaction(async (tx) => {
      // A. Terminate the active lease
      await tx.lease.update({
        where: { id: activeLease.id },
        data: {
          status: 'TERMINATED',
          end_date: now,
        },
      });

      // B. Release the occupied bed back to VACANT
      if (tenant.bed_id) {
        await tx.bed.update({
          where: { id: tenant.bed_id },
          data: { status: 'VACANT' },
        });

        // C. Detach bed from tenant profile
        await tx.tenantProfile.update({
          where: { id: tenant.id },
          data: { bed_id: null },
        });
      }

      // D. Mark open invoices as settled against deposit if applicable
      if (totalUnpaidDues > 0 && depositAmount > 0) {
        let remainingDepositToApply = depositAmount - damageDeduction;

        for (const inv of tenant.invoices) {
          if (remainingDepositToApply <= 0) break;
          const due = Number(inv.total_amount) - Number(inv.amount_paid);
          const applyAmount = Math.min(due, remainingDepositToApply);

          const newPaid = Number(inv.amount_paid) + applyAmount;
          const isFull = newPaid >= Number(inv.total_amount);

          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              amount_paid: newPaid,
              status: isFull ? 'PAID' : 'PARTIALLY_PAID',
            },
          });

          remainingDepositToApply -= applyAmount;
        }
      }

      // E. Deactivate user access if requested
      await tx.user.update({
        where: { id: tenant.user_id },
        data: { is_active: false },
      });
    });

    // 4. Double-entry ledger entry for deposit refund / forfeiture
    try {
      if (depositAmount > 0) {
        const ledgerLines = [
          { accountCode: '2100', debit: depositAmount, credit: 0 }, // Tenant Security Deposit Liability
        ];
        if (netRefundable > 0) {
          ledgerLines.push({ accountCode: '1010', debit: 0, credit: netRefundable }); // Bank/Cash refund
        }
        if (damageDeduction > 0) {
          ledgerLines.push({ accountCode: '4020', debit: 0, credit: damageDeduction }); // Repair/Damage Income
        }
        if (totalUnpaidDues > 0) {
          ledgerLines.push({ accountCode: '1200', debit: 0, credit: Math.min(depositAmount - damageDeduction, totalUnpaidDues) }); // Accounts Receivable
        }

        await postLedgerEntry({
          workspace_id: workspaceId,
          reference_id: `MOVEOUT-${tenant.id.substring(0, 8)}`,
          description: `Deposit settlement on move-out for ${tenant.user.first_name} ${tenant.user.last_name}`,
          debit_account_code: '2100', // Tenant Security Deposit Liability
          credit_account_code: '1010', // Operating Bank / Cash Account
          amount: netRefundable > 0 ? netRefundable : depositAmount,
        });
      }
    } catch (ledgerErr) {
      console.warn('Move-out ledger posting error:', ledgerErr);
    }

    // 5. Dispatch notification
    try {
      if (tenant.user.email) {
        await dispatchNotification('EMAIL', tenant.user.email, {
          subject: 'Move-Out Processed — PG_SAS',
          body: `Hello ${tenant.user.first_name}, your move-out has been processed. Deposit: ₹${depositAmount}. Deductions: ₹${totalDeductions}. Net Refund: ₹${netRefundable}. Thank you for staying with us.`,
        });
      }

    } catch (notifErr) {
      console.warn('Move-out notification error:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Move-out successfully processed and bed marked VACANT',
      settlement: {
        depositAmount,
        totalUnpaidDues,
        damageDeduction,
        netRefundable,
        balanceOwedByTenant,
        refundMethod,
        deductionNotes,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Move-out error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process move-out' }, { status: 500 });
  }
}
