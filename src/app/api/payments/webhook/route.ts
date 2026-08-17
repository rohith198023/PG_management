import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { decryptSecret } from '@/lib/crypto';
import { postLedgerEntry } from '@/lib/ledger/posting';
import { logPaymentAudit } from '@/lib/audit';

export async function POST(req: Request) {
  const correlationId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || req.headers.get('stripe-signature') || '';
    const gatewayHeader = req.headers.get('x-gateway-provider') || 'razorpay';
    const workspaceHeader = req.headers.get('x-workspace-id');

    if (!workspaceHeader) {
      return NextResponse.json({ error: 'Missing x-workspace-id header' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.id || payload.event_id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const eventType = payload.event || payload.type || 'payment.authorized';
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

    // 1. Replay & Duplicate Event Check
    const existingWebhook = await prisma.webhookEvent.findUnique({
      where: {
        workspace_id_event_id: {
          workspace_id: workspaceHeader,
          event_id: eventId,
        },
      },
    });

    if (existingWebhook) {
      return NextResponse.json({
        message: 'Duplicate webhook event ignored (Idempotent)',
        eventId,
        status: 'DUPLICATE',
      });
    }

    // 2. Fetch Gateway Config & Verify Signature
    const config = await prisma.gatewayConfig.findFirst({
      where: { workspace_id: workspaceHeader, gateway_name: gatewayHeader },
    });

    let isSignatureValid = true;
    if (config && config.webhook_secret_enc) {
      const secret = decryptSecret(config.webhook_secret_enc);
      if (gatewayHeader === 'razorpay') {
        const expectedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        isSignatureValid = expectedSig === signature;
      }
    }

    if (!isSignatureValid) {
      await prisma.webhookEvent.create({
        data: {
          workspace_id: workspaceHeader,
          gateway_name: gatewayHeader,
          event_id: eventId,
          event_type: eventType,
          payload_hash: payloadHash,
          signature,
          status: 'FAILED',
          correlation_id: correlationId,
          error_message: 'Invalid HMAC Signature (401 Unauthorized)',
          raw_payload: payload,
        },
      });

      return NextResponse.json({ error: 'Invalid Webhook Signature' }, { status: 401 });
    }

    // 3. Process Transactional Payment Payload
    let processedStatus = 'PROCESSED';
    const invoiceId = payload.payload?.payment?.entity?.notes?.invoice_id || payload.data?.object?.metadata?.invoice_id;
    const amount = (payload.payload?.payment?.entity?.amount || payload.data?.object?.amount || 0) / 100;

    if (invoiceId && amount > 0) {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, workspace_id: workspaceHeader },
      });

      if (invoice) {
        await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.create({
            data: {
              workspace_id: workspaceHeader,
              tenant_id: invoice.tenant_id,
              invoice_id: invoice.id,
              amount,
              source: 'GATEWAY',
              status: 'PAID',
              transaction_ref: eventId,
              auto_reconciled: true,
            },
          });

          const newAmountPaid = Number(invoice.amount_paid) + amount;
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              amount_paid: newAmountPaid,
              status: newAmountPaid >= Number(invoice.total_amount) ? 'PAID' : 'PARTIALLY_PAID',
            },
          });

          await tx.paymentReceipt.create({
            data: {
              workspace_id: workspaceHeader,
              payment_id: payment.id,
              receipt_number: `REC-${Date.now()}`,
            },
          });
        });

        await postLedgerEntry({
          workspace_id: workspaceHeader,
          debit_account_code: '1010',
          credit_account_code: '1030',
          amount,
          description: `Webhook Payment Auto-Settlement (${eventType})`,
          reference_id: eventId,
        });
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // 4. Record Webhook Audit Record
    await prisma.webhookEvent.create({
      data: {
        workspace_id: workspaceHeader,
        gateway_name: gatewayHeader,
        event_id: eventId,
        event_type: eventType,
        payload_hash: payloadHash,
        signature,
        status: processedStatus as any,
        correlation_id: correlationId,
        processing_time_ms: processingTimeMs,
        raw_payload: payload,
      },
    });

    await logPaymentAudit({
      workspaceId: workspaceHeader,
      action: 'WEBHOOK_PROCESSED_SUCCESS',
      correlationId,
      newValues: { eventId, eventType, processingTimeMs },
    });

    return NextResponse.json({
      message: 'Webhook processed successfully',
      eventId,
      status: processedStatus,
      processingTimeMs,
      correlationId,
    });
  } catch (error: any) {
    console.error('Webhook Handler Error:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing error' }, { status: 500 });
  }
}
