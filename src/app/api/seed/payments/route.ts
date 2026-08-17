import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { processPaymentProofOCR, evaluateFraudRisk } from '@/lib/ocr_fraud';

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;

    let tenant = await prisma.tenantProfile.findFirst({
      where: { workspace_id: workspaceId },
      include: { user: true },
    });

    if (!tenant) {
      // Find or create a user with TENANT role
      let user = await prisma.user.findFirst({
        where: { workspace_id: workspaceId, role: 'TENANT' },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            workspace_id: workspaceId,
            email: `tenant_${Date.now()}@example.com`,
            password_hash: 'hashed_demo_pass',
            first_name: 'Demo',
            last_name: 'Resident',
            phone: '9876543210',
            role: 'TENANT',
          },
        });
      }

      tenant = await prisma.tenantProfile.create({
        data: {
          workspace_id: workspaceId,
          user_id: user.id,
          emergency_contact: 'Parent Contact (9876543210)',
        },
        include: { user: true },
      });
    }

    let invoice = await prisma.invoice.findFirst({
      where: { workspace_id: workspaceId, tenant_id: tenant.id },
    });

    if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          workspace_id: workspaceId,
          tenant_id: tenant.id,
          invoice_number: `INV-202608-${Math.floor(1000 + Math.random() * 9000)}`,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          subtotal: 12500,
          total_amount: 12500,
          status: 'ISSUED',
        },
      });
    }

    const testUtr = `4208${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testAmount = Number(invoice.total_amount);

    const ocrResult = await processPaymentProofOCR(
      'https://placehold.co/600x400/0f172a/cbd5e1?text=GPay+UPI+Scan',
      `Txn Ref: ${testUtr} Amount: ₹${testAmount}`,
      testAmount
    );

    const fraudResult = await evaluateFraudRisk(workspaceId, testUtr, testAmount, testAmount, 68);

    const payment = await prisma.payment.create({
      data: {
        workspace_id: workspaceId,
        tenant_id: tenant.id,
        invoice_id: invoice.id,
        amount: testAmount,
        source: 'MANUAL_UPLOAD',
        status: 'PENDING_VERIFICATION',
        transaction_ref: `UTR-${testUtr}`,
      },
    });

    const proof = await prisma.paymentProof.create({
      data: {
        workspace_id: workspaceId,
        payment_id: payment.id,
        proof_image_url: 'https://placehold.co/600x400/0f172a/cbd5e1?text=GPay+UPI+Scan',
        utr_number: testUtr,
        notes: 'Paid via GPay UPI',
      },
    });

    if ((prisma as any).oCRResult) {
      try {
        await (prisma as any).oCRResult.create({
          data: {
            proof_id: proof.id,
            utr_number: testUtr,
            amount: testAmount,
            payment_date: new Date().toISOString().split('T')[0],
            merchant_vpa: 'pg.sas@hdfcbank',
            overall_confidence: 68.5,
            utr_matched: true,
            amount_matched: true,
            merchant_matched: true,
            raw_text: `Scan: UTR ${testUtr} Amount ₹${testAmount}`,
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
            risk_level: 'MEDIUM',
            risk_score: 35,
            flags: ['MEDIUM_CONFIDENCE_OCR', 'NEEDS_MANAGER_VERIFICATION'],
            utr_duplicate_count: 0,
            is_flagged: true,
          },
        });
      } catch (e) {
        console.warn('FraudCheck creation skipped:', e);
      }
    }

    return NextResponse.json({
      message: `Demo test payment proof (UTR: ${testUtr}) created for ${tenant.user?.first_name || 'Demo'} ${tenant.user?.last_name || 'Resident'}! Placed in Manager Verification Queue.`,
      paymentId: payment.id,
      utr: testUtr,
      amount: testAmount,
    });
  } catch (error: any) {
    console.error('Seed Payment Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to seed test payment' }, { status: 500 });
  }
}
