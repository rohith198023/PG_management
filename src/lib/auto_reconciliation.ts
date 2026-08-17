import { prisma } from './prisma';
import { postLedgerEntry } from './ledger';
import { logPaymentAudit } from './audit';

/**
 * Auto-Reconciliation Engine:
 * Automatically approves payments if:
 * 1. FinancialSettings auto_reconcile_enabled is true
 * 2. OCR confidence >= 85%
 * 3. UTR is unique (duplicate count === 0)
 * 4. Extracted amount matches invoice exact amount
 * 5. Fraud risk level is LOW
 */
export async function attemptAutoReconciliation(workspaceId: string, paymentProofId: string) {
  const finSettings = await prisma.financialSettings.findUnique({
    where: { workspace_id: workspaceId },
  });

  // If auto-reconciliation is disabled, leave in manager exception queue
  if (finSettings && !finSettings.auto_reconcile_enabled) {
    return { autoApproved: false, reason: 'Auto-reconciliation disabled in Financial Settings' };
  }

  const proof = await prisma.paymentProof.findUnique({
    where: { id: paymentProofId },
    include: {
      payment: {
        include: {
          invoice: true,
        },
      },
      ocr_result: true,
      fraud_check: true,
    },
  });

  if (!proof || !proof.ocr_result || !proof.fraud_check) {
    return { autoApproved: false, reason: 'Missing OCR or Fraud Check data' };
  }

  const { ocr_result: ocr, fraud_check: fraud, payment } = proof;

  const isEligible =
    ocr.overall_confidence >= 85 &&
    ocr.utr_matched &&
    ocr.amount_matched &&
    fraud.utr_duplicate_count === 0 &&
    fraud.risk_level === 'LOW';

  if (!isEligible) {
    return {
      autoApproved: false,
      reason: `Requires Manager Review: Risk=${fraud.risk_level}, OCR Confidence=${ocr.overall_confidence}%, Duplicates=${fraud.utr_duplicate_count}`,
    };
  }

  // Execute Auto-Approval inside transaction
  await prisma.$transaction(async (tx) => {
    // 1. Update Payment status
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        auto_reconciled: true,
      },
    });

    // 2. Update Invoice status & amount paid
    const newAmountPaid = Number(payment.invoice.amount_paid) + Number(payment.amount);
    const invoiceTotal = Number(payment.invoice.total_amount);
    const isFullyPaid = newAmountPaid >= invoiceTotal;

    await tx.invoice.update({
      where: { id: payment.invoice_id },
      data: {
        amount_paid: newAmountPaid,
        status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
      },
    });

    // 3. Post Double-Entry Ledger Entry
    await postLedgerEntry({
      workspace_id: workspaceId,
      debit_account_code: '1010', // Cash / Bank Account
      credit_account_code: '1200', // Accounts Receivable
      amount: Number(payment.amount),
      description: `Auto-Reconciled Payment for Invoice #${payment.invoice.invoice_number} (UTR: ${proof.utr_number || 'N/A'})`,
      reference_id: payment.id,
    });

    // 4. Create Payment Receipt
    const receiptNum = `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    await tx.paymentReceipt.create({
      data: {
        workspace_id: workspaceId,
        payment_id: payment.id,
        receipt_number: receiptNum,
      },
    });
  });

  // Log Audit record
  await logPaymentAudit({
    workspaceId,
    paymentId: payment.id,
    action: 'AUTO_RECONCILED_SUCCESS',
    newValues: { utr: proof.utr_number, amount: payment.amount },
  });

  return { autoApproved: true, reason: 'Matched UTR & Amount with 100% confidence. Auto-approved!' };
}
