import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { z } from 'zod';
import { processPaymentProofOCR, evaluateFraudRisk } from '@/lib/ocr_fraud';
import { attemptAutoReconciliation } from '@/lib/auto_reconciliation';

const proofSchema = z.object({
  invoiceId: z.string().uuid(),
  proofImageUrl: z.string().url('Proof image URL is required'),
  utrNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const body = await req.json();
    const { invoiceId, proofImageUrl, utrNumber, notes } = proofSchema.parse(body);

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspace_id: workspaceId },
      include: { tenant: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const dueAmount = Number(invoice.total_amount) - Number(invoice.amount_paid);

    // 1. Run OCR Processing Engine
    const ocrResult = await processPaymentProofOCR(proofImageUrl, notes || utrNumber || null, dueAmount);
    const finalUtr = utrNumber || ocrResult.utrNumber;

    // 2. Run Fraud Detection Risk Engine
    const fraudResult = await evaluateFraudRisk(
      workspaceId,
      finalUtr,
      ocrResult.extractedAmount,
      dueAmount,
      ocrResult.overallConfidence
    );

    // 3. Create Payment & PaymentProof records
    const payment = await prisma.payment.create({
      data: {
        workspace_id: workspaceId,
        tenant_id: invoice.tenant_id,
        invoice_id: invoice.id,
        amount: dueAmount,
        source: 'MANUAL_UPLOAD',
        status: 'PENDING_VERIFICATION',
        transaction_ref: finalUtr ? `UTR-${finalUtr}` : `MANUAL-${Date.now()}`,
      },
    });

    const proof = await prisma.paymentProof.create({
      data: {
        workspace_id: workspaceId,
        payment_id: payment.id,
        proof_image_url: proofImageUrl,
        utr_number: finalUtr,
        notes,
      },
    });

    // 4. Safely attach OCR & Fraud Check records if models exist
    if ((prisma as any).oCRResult) {
      try {
        await (prisma as any).oCRResult.create({
          data: {
            proof_id: proof.id,
            utr_number: finalUtr,
            amount: ocrResult.extractedAmount,
            payment_date: ocrResult.paymentDate,
            merchant_vpa: ocrResult.merchantVpa,
            overall_confidence: ocrResult.overallConfidence,
            utr_matched: ocrResult.utrMatched,
            amount_matched: ocrResult.amountMatched,
            merchant_matched: ocrResult.merchantMatched,
            raw_text: ocrResult.rawText,
          },
        });
      } catch (e) {
        console.warn('OCRResult creation skipped:', e);
      }
    }

    if ((prisma as any).fraudCheck) {
      try {
        await (prisma as any).fraudCheck.create({
          data: {
            proof_id: proof.id,
            risk_level: fraudResult.riskLevel,
            risk_score: fraudResult.riskScore,
            flags: fraudResult.flags,
            utr_duplicate_count: fraudResult.utrDuplicateCount,
            is_flagged: fraudResult.isFlagged,
          },
        });
      } catch (e) {
        console.warn('FraudCheck creation skipped:', e);
      }
    }

    // 5. Manual uploads enter PENDING_VERIFICATION queue for manager inspection
    return NextResponse.json({
      message: 'Payment receipt uploaded successfully! Placed in Manager Review Queue.',
      paymentId: payment.id,
      proofId: proof.id,
      ocr: {
        confidence: ocrResult.overallConfidence,
        utrMatched: ocrResult.utrMatched,
        amountMatched: ocrResult.amountMatched,
        merchantMatched: ocrResult.merchantMatched,
      },
      fraud: {
        riskLevel: fraudResult.riskLevel,
        riskScore: fraudResult.riskScore,
        flags: fraudResult.flags,
      },
      autoReconciled: false,
    });
  } catch (error: any) {
    console.error('Proof Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload proof' }, { status: 500 });
  }
}
