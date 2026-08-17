import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { z } from 'zod';
import { checkIdempotency } from '@/lib/idempotency';
import { getBestAvailableGateway } from '@/lib/failover';
import { IntentStatus } from '@prisma/client';

const createIntentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  gatewayName: z.string().default('razorpay'),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const userId = auth.session.userId;
    const idempotencyKey = req.headers.get('idempotency-key') || `intent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Idempotency Check
    const idemResult = await checkIdempotency(idempotencyKey, workspaceId);
    if (idemResult?.isDuplicate && idemResult.intent) {
      return NextResponse.json({
        message: 'Returning existing PaymentIntent (Idempotency Key Matched)',
        intent: idemResult.intent,
      });
    }

    const body = await req.json();
    const { invoiceId, amount, gatewayName } = createIntentSchema.parse(body);

    // Verify invoice belongs to workspace
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspace_id: workspaceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Find tenant
    const tenant = await prisma.tenantProfile.findFirst({
      where: { workspace_id: workspaceId, user_id: userId },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant profile not found for user' }, { status: 404 });
    }

    // 2. Gateway Failover Check
    const failoverResult = await getBestAvailableGateway(workspaceId, gatewayName);

    // 3. Create PaymentIntent
    const orderId = `order_${failoverResult.selectedGateway}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const intent = await prisma.paymentIntent.create({
      data: {
        workspace_id: workspaceId,
        tenant_id: tenant.id,
        invoice_id: invoice.id,
        amount,
        currency: 'INR',
        idempotency_key: idempotencyKey,
        gateway_name: failoverResult.selectedGateway,
        gateway_order_id: orderId,
        status: IntentStatus.CREATED,
        expires_at: expiresAt,
      },
    });

    return NextResponse.json({
      message: 'PaymentIntent created successfully',
      intent: {
        id: intent.id,
        orderId: intent.gateway_order_id,
        amount: intent.amount,
        currency: intent.currency,
        gatewayName: intent.gateway_name,
        isFailoverApplied: failoverResult.isFailover,
        failoverReason: failoverResult.reason,
        expiresAt: intent.expires_at,
      },
    });
  } catch (error: any) {
    console.error('Create PaymentIntent Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create PaymentIntent' }, { status: 500 });
  }
}
