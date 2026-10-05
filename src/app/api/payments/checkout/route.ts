import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { z } from 'zod';
import { createGatewayOrder } from '@/lib/payments/gateway';

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
    const userId = auth.session.userId;
    const body = await req.json();
    const { invoiceId, gatewayProvider, customAmount } = checkoutSchema.parse(body);

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        workspace_id: workspaceId,
      },
      include: {
        tenant: {
          include: { user: true },
        },
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

    // Create a real order on the payment gateway
    const orderResult = await createGatewayOrder({
      workspaceId,
      amount: payAmount,
      receipt: invoice.invoice_number,
      gatewayName: gatewayProvider,
      notes: {
        invoice_id: invoice.id,
        tenant_id: invoice.tenant_id,
        tenant_name: `${invoice.tenant.user.first_name} ${invoice.tenant.user.last_name}`,
        user_id: userId,
      },
    });

    // Record PaymentIntent in DB with status CREATED
    const idempotencyKey = `intent_${orderResult.orderId}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const paymentIntent = await prisma.paymentIntent.upsert({
      where: { idempotency_key: idempotencyKey },
      update: {
        amount: payAmount,
        gateway_order_id: orderResult.orderId,
        expires_at: expiresAt,
      },
      create: {
        workspace_id: workspaceId,
        tenant_id: invoice.tenant_id,
        invoice_id: invoice.id,
        amount: payAmount,
        currency: orderResult.currency,
        idempotency_key: idempotencyKey,
        gateway_name: gatewayProvider,
        gateway_order_id: orderResult.orderId,
        status: 'CREATED',
        expires_at: expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Checkout order initialized successfully',
      intentId: paymentIntent.id,
      orderId: orderResult.orderId,
      keyId: orderResult.keyId,
      amount: orderResult.amount, // in paise
      currency: orderResult.currency,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      isMock: orderResult.isMock,
      tenant: {
        name: `${invoice.tenant.user.first_name} ${invoice.tenant.user.last_name}`,
        email: invoice.tenant.user.email,
        phone: invoice.tenant.user.phone,
      },
    });
  } catch (error: any) {
    console.error('Payment checkout error:', error);
    return NextResponse.json({ error: error.message || 'Failed to initialize checkout' }, { status: 500 });
  }
}
