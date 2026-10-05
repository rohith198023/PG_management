import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { z } from 'zod';
import { verifyGatewayPaymentSignature } from '@/lib/payments/gateway';
import { postLedgerEntry } from '@/lib/ledger/posting';
import { logPaymentAudit } from '@/lib/audit';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

const confirmSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  orderId: z.string().min(1, 'Order ID is required'),
  paymentId: z.string().min(1, 'Payment ID is required'),
  signature: z.string().min(1, 'Signature is required'),
  amount: z.number().positive().optional(),
  gatewayProvider: z.string().default('razorpay'),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const body = await req.json();
    const { invoiceId, orderId, paymentId, signature, amount, gatewayProvider } = confirmSchema.parse(body);

    // 1. Verify signature cryptographically
    const isValid = await verifyGatewayPaymentSignature({
      workspaceId,
      orderId,
      paymentId,
      signature,
      gatewayName: gatewayProvider,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Cryptographic payment verification failed. Invalid signature.' }, { status: 400 });
    }

    // 2. Fetch and validate invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspace_id: workspaceId },
      include: {
        tenant: {
          include: { user: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 3. Prevent duplicate payment processing (Idempotency)
    const existingPayment = await prisma.payment.findFirst({
      where: {
        workspace_id: workspaceId,
        transaction_ref: paymentId,
      },
      include: { receipt: true },
    });

    if (existingPayment) {
      return NextResponse.json({
        message: 'Payment already processed',
        payment: existingPayment,
        receiptNumber: existingPayment.receipt?.receipt_number,
      });
    }

    const dueAmount = Number(invoice.total_amount) - Number(invoice.amount_paid);
    const payAmount = amount ? Math.min(amount, dueAmount) : dueAmount;

    if (payAmount <= 0) {
      return NextResponse.json({ error: 'Invoice has no remaining due balance.' }, { status: 400 });
    }

    // 4. Execute atomic transaction
    let newPayment: any = null;
    let newReceiptNumber = '';

    await prisma.$transaction(async (tx) => {
      // Find default bank account if available
      let defaultBankId: string | null = null;
      try {
        const bank = await tx.bankAccount.findFirst({
          where: { workspace_id: workspaceId, is_default: true },
        });
        if (bank) defaultBankId = bank.id;
      } catch {}

      // Create Payment record
      newPayment = await tx.payment.create({
        data: {
          workspace_id: workspaceId,
          tenant_id: invoice.tenant_id,
          invoice_id: invoice.id,
          amount: payAmount,
          source: 'GATEWAY',
          status: 'PAID',
          transaction_ref: paymentId,
          idempotency_key: `pay_${paymentId}`,
          auto_reconciled: true,
          ...(defaultBankId ? { bank_account_id: defaultBankId } : {}),
        },
      });

      // Update Invoice
      const newAmountPaid = Number(invoice.amount_paid) + payAmount;
      const isFullyPaid = newAmountPaid >= Number(invoice.total_amount);

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amount_paid: newAmountPaid,
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
        },
      });

      // Update PaymentIntent status
      try {
        await tx.paymentIntent.updateMany({
          where: {
            workspace_id: workspaceId,
            gateway_order_id: orderId,
          },
          data: { status: 'SUCCEEDED' },
        });
      } catch {}

      // Generate Receipt
      newReceiptNumber = `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      await tx.paymentReceipt.create({
        data: {
          workspace_id: workspaceId,
          payment_id: newPayment.id,
          receipt_number: newReceiptNumber,
        },
      });
    });

    // 5. Post double-entry accounting ledger entries
    try {
      await postLedgerEntry({
        workspace_id: workspaceId,
        reference_id: `PAY-${paymentId}`,
        description: `Online rent payment via ${gatewayProvider.toUpperCase()} for Invoice #${invoice.invoice_number}`,
        debit_account_code: '1010',
        credit_account_code: '1030',
        amount: payAmount,
      });
    } catch (ledgerErr) {
      console.warn('Ledger posting warning on payment confirm:', ledgerErr);
    }


    // 6. Audit logging
    await logPaymentAudit({
      workspaceId,
      paymentId: newPayment.id,
      userId: auth.session.userId,
      action: 'PAYMENT_VERIFIED_ONLINE',
      newValues: {
        amount: payAmount,
        orderId,
        paymentId,
        gateway: gatewayProvider,
        receipt: newReceiptNumber,
      },
      correlationId: `confirm_${paymentId}`,
    });

    // 7. Dispatch notification
    try {
      if (invoice.tenant?.user?.email) {
        await dispatchNotification('EMAIL', invoice.tenant.user.email, {
          subject: 'Payment Successful',
          body: `Your payment of ₹${payAmount} for Invoice #${invoice.invoice_number} has been received. Receipt #${newReceiptNumber} generated.`,
        });

      }
    } catch (notifErr) {
      console.warn('Notification dispatch error:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and processed successfully',
      paymentId: newPayment.id,
      receiptNumber: newReceiptNumber,
      amount: payAmount,
    });
  } catch (error: any) {
    console.error('Payment confirm error:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify payment' }, { status: 500 });
  }
}
