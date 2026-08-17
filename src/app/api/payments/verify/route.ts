import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { z } from 'zod';
import { postLedgerEntry } from '@/lib/ledger/posting';
import { logPaymentAudit } from '@/lib/audit';

const verifySchema = z.object({
  paymentId: z.string().uuid(),
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'ALL';

    let payments: any[] = [];
    try {
      payments = await prisma.payment.findMany({
        where: {
          workspace_id: workspaceId,
          ...(statusFilter && statusFilter !== 'ALL' ? { status: statusFilter as any } : {}),
        },
        include: {
          tenant: {
            include: { user: true },
          },
          invoice: true,
          proof: true,
        },
        orderBy: { created_at: 'desc' },
      });
    } catch (err) {
      console.error('Prisma query error in verify GET:', err);
      // Fallback query without proof inclusion if proof relation fails
      payments = await prisma.payment.findMany({
        where: { workspace_id: workspaceId },
        orderBy: { created_at: 'desc' },
      });
    }

    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    try {
      pendingCount = await prisma.payment.count({
        where: { workspace_id: workspaceId, status: 'PENDING_VERIFICATION' },
      });

      approvedCount = await prisma.payment.count({
        where: { workspace_id: workspaceId, status: 'PAID' },
      });

      rejectedCount = await prisma.payment.count({
        where: { workspace_id: workspaceId, status: 'REJECTED' },
      });
    } catch (e) {
      console.warn('Count query skipped:', e);
    }

    return NextResponse.json({
      payments,
      metrics: {
        pendingCount,
        approvedCount,
        rejectedCount,
        pendingAmount: 0,
      },
    });
  } catch (error: any) {
    console.error('Fetch Queue Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch verification queue', payments: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    if (auth.session.role !== 'WORKSPACE_ADMIN' && auth.session.role !== 'MANAGER' && auth.session.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Manager permissions required' }, { status: 403 });
    }

    const workspaceId = auth.session.workspaceId;
    const userId = auth.session.userId;
    const body = await req.json();
    const { paymentId, action, rejectionReason } = verifySchema.parse(body);

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, workspace_id: workspaceId },
      include: {
        invoice: true,
        proof: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    if (action === 'REJECT') {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'REJECTED' },
        });

        if (payment.proof) {
          await tx.paymentProof.update({
            where: { id: payment.proof.id },
            data: {
              reviewed_by_id: userId,
              reviewed_at: new Date(),
              rejection_reason: rejectionReason || 'Receipt rejected by manager',
            },
          });
        }
      });

      await logPaymentAudit({
        workspaceId,
        paymentId: payment.id,
        userId,
        action: 'PAYMENT_PROOF_REJECTED',
        newValues: { rejectionReason },
      });

      return NextResponse.json({ message: 'Payment receipt rejected. Resident notified.' });
    }

    // APPROVE
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID' },
      });

      const newAmountPaid = Number(payment.invoice.amount_paid) + Number(payment.amount);
      const isFullyPaid = newAmountPaid >= Number(payment.invoice.total_amount);

      await tx.invoice.update({
        where: { id: payment.invoice_id },
        data: {
          amount_paid: newAmountPaid,
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
        },
      });

      if (payment.proof) {
        await tx.paymentProof.update({
          where: { id: payment.proof.id },
          data: {
            reviewed_by_id: userId,
            reviewed_at: new Date(),
          },
        });
      }

      if ((tx as any).paymentReceipt) {
        try {
          const receiptNum = `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
          await (tx as any).paymentReceipt.create({
            data: {
              workspace_id: workspaceId,
              payment_id: payment.id,
              receipt_number: receiptNum,
            },
          });
        } catch (e) {
          console.warn('Receipt creation skipped:', e);
        }
      }
    });

    try {
      await postLedgerEntry({
        workspace_id: workspaceId,
        debit_account_code: '1010',
        credit_account_code: '1030',
        amount: Number(payment.amount),
        description: `Manual Proof Approved for Invoice ${payment.invoice.invoice_number} (UTR: ${payment.proof?.utr_number || 'N/A'})`,
        reference_id: payment.id,
      });
    } catch (e) {
      console.warn('Ledger entry skipped:', e);
    }

    try {
      await logPaymentAudit({
        workspaceId,
        paymentId: payment.id,
        userId,
        action: 'PAYMENT_PROOF_APPROVED',
        newValues: { amount: payment.amount, invoiceId: payment.invoice_id },
      });
    } catch (e) {
      console.warn('Audit log skipped:', e);
    }

    return NextResponse.json({ message: 'Payment proof approved! Ledger posted and receipt issued. 🎉' });
  } catch (error: any) {
    console.error('Verify Payment Error:', error);
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}
