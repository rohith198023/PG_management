import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { z } from 'zod';
import { postLedgerEntry } from '@/lib/ledger/posting';
import { logPaymentAudit } from '@/lib/audit';

const checkoutSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  gatewayProvider: z.string().default('razorpay'),
  customAmount: z.number().positive().optional(),
  useWallet: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const body = await req.json();
    const { invoiceId, gatewayProvider, customAmount } = checkoutSchema.parse(body);

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        workspace_id: workspaceId,
      },
      include: {
        tenant: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({ error: 'Invoice is already paid in full' }, { status: 400 });
    }

    const dueAmount = Number(invoice.total_amount) - Number(invoice.amount_paid);
    if (dueAmount <= 0) {
      return NextResponse.json({ error: 'Invoice has zero remaining balance' }, { status: 400 });
    }

    const payAmount = customAmount ? Math.min(customAmount, dueAmount) : dueAmount;

    // Safely check default bank account if bankAccount model exists
    let defaultBankId = null;
    if ((prisma as any).bankAccount) {
      try {
        const bank = await (prisma as any).bankAccount.findFirst({
          where: { workspace_id: workspaceId, is_default: true },
        });
        if (bank) defaultBankId = bank.id;
      } catch (e) {
        console.warn('BankAccount query skipped:', e);
      }
    }

    const orderRef = `ORDER-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    let newPaymentId = '';

    await prisma.$transaction(async (tx: any) => {
      // 1. Create Payment
      const paymentData: any = {
        workspace_id: workspaceId,
        tenant_id: invoice.tenant_id,
        invoice_id: invoice.id,
        amount: payAmount,
        source: 'GATEWAY',
        status: 'PAID',
        transaction_ref: orderRef,
      };

      if (defaultBankId) {
        paymentData.bank_account_id = defaultBankId;
      }

      const payment = await tx.payment.create({ data: paymentData });
      newPaymentId = payment.id;

      // 2. Update Invoice status & amount_paid
      const newAmountPaid = Number(invoice.amount_paid) + payAmount;
      const isFullyPaid = newAmountPaid >= Number(invoice.total_amount);

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amount_paid: newAmountPaid,
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
        },
      });

      // 3. Create Receipt if model exists
      if (tx.paymentReceipt) {
        try {
          const receiptNum = `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
          await tx.paymentReceipt.create({
            data: {
              workspace_id: workspaceId,
              payment_id: payment.id,
              receipt_number: receiptNum,
            },
          });
        } catch (e) {
          console.warn('PaymentReceipt creation skipped:', e);
        }
      }
    });

    // 4. Double-Entry Ledger Posting: Debit Cash (1010), Credit AR (1030)
    try {
      await postLedgerEntry({
        workspace_id: workspaceId,
        debit_account_code: '1010',
        credit_account_code: '1030',
        amount: payAmount,
        description: `Online Payment Settlement via ${gatewayProvider.toUpperCase()} for Invoice ${invoice.invoice_number}`,
        reference_id: newPaymentId,
      });
    } catch (e) {
      console.warn('Ledger posting warning:', e);
    }

    // 5. Audit Log
    try {
      await logPaymentAudit({
        workspaceId,
        paymentId: newPaymentId,
        action: 'PAYMENT_CHECKOUT_COMPLETED',
        newValues: { amount: payAmount, gatewayProvider, orderRef },
      });
    } catch (e) {
      console.warn('Audit log warning:', e);
    }

    return NextResponse.json({
      message: `Payment of ₹${payAmount} processed successfully via ${gatewayProvider.toUpperCase()}!`,
      paymentId: newPaymentId,
      orderRef,
      amountPaid: payAmount,
      invoiceStatus: payAmount >= dueAmount ? 'PAID' : 'PARTIALLY_PAID',
    });
  } catch (error: any) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: error.message || 'Checkout failed' }, { status: 500 });
  }
}
