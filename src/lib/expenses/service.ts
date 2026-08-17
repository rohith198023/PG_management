/**
 * @module expenses/service
 * Business logic for Expense Voucher lifecycle management.
 *
 * Single Responsibility: Only handles expense business rules (create, approve, reject).
 * Dependency Inversion: Depends on IExpenseRepository and ledger posting abstractions —
 *   not on Prisma, raw SQL, or HTTP concerns directly.
 * Open/Closed: New approval workflows (e.g., multi-level) can be added as new
 *   functions without modifying existing approveExpense logic.
 */

import { getExpenseRepository } from './repository';
import { postLedgerEntry, getExpenseAccountCode } from '@/lib/ledger/posting';
import { initializeWorkspaceLedgerAccounts as ensureCoa } from '@/lib/ledger/coa';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExpenseRole = 'WORKSPACE_ADMIN' | 'MANAGER' | 'PLATFORM_SUPER_ADMIN' | string;

export interface CreateExpenseParams {
  workspaceId: string;
  userId: string;
  userRole: ExpenseRole;
  title: string;
  category: string;
  amount: number;
  taxAmount: number;
  vendorName?: string;
  paymentMethod: string;
  receiptUrl?: string;
  notes?: string;
}

export interface ApproveExpenseParams {
  expenseId: string;
  workspaceId: string;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Creates an expense voucher.
 * WORKSPACE_ADMIN / PLATFORM_SUPER_ADMIN expenses are auto-approved and immediately
 * posted to the general ledger. Manager/Staff submissions enter PENDING state.
 */
export async function createExpense(params: CreateExpenseParams): Promise<{
  expenseId: string;
  autoApproved: boolean;
}> {
  const repo = getExpenseRepository();
  const isAutoApproved =
    params.userRole === 'WORKSPACE_ADMIN' || params.userRole === 'PLATFORM_SUPER_ADMIN';

  const expenseId = crypto.randomUUID();
  const status    = isAutoApproved ? 'APPROVED' : 'PENDING';

  await repo.create({
    id:             expenseId,
    workspace_id:   params.workspaceId,
    title:          params.title,
    category:       params.category,
    amount:         params.amount,
    tax_amount:     params.taxAmount,
    vendor_name:    params.vendorName,
    payment_method: params.paymentMethod,
    receipt_url:    params.receiptUrl,
    notes:          params.notes,
    status,
    created_by_id:  params.userId,
  });

  if (isAutoApproved && params.amount > 0) {
    await _postExpenseToLedger({
      workspaceId:  params.workspaceId,
      expenseId,
      category:     params.category,
      amount:       params.amount,
      title:        params.title,
      vendorName:   params.vendorName,
    });
  }

  return { expenseId, autoApproved: isAutoApproved };
}

/**
 * Approves a PENDING expense and posts it to the General Ledger.
 * Returns false if the expense was not found.
 */
export async function approveExpense(params: ApproveExpenseParams): Promise<boolean> {
  const repo = getExpenseRepository();

  await repo.updateStatus(params.expenseId, params.workspaceId, 'APPROVED');

  const expense = await repo.findById(params.expenseId, params.workspaceId);
  if (!expense) {
    console.warn(`[ExpenseService] approveExpense: expense ${params.expenseId} not found after update`);
    return false;
  }

  if (expense.amount > 0) {
    await _postExpenseToLedger({
      workspaceId: params.workspaceId,
      expenseId:   params.expenseId,
      category:    expense.category,
      amount:      expense.amount,
      title:       expense.title,
      vendorName:  expense.vendor_name ?? undefined,
    });
  }

  return true;
}

/**
 * Rejects a PENDING expense voucher.
 */
export async function rejectExpense(params: ApproveExpenseParams): Promise<void> {
  const repo = getExpenseRepository();
  await repo.updateStatus(params.expenseId, params.workspaceId, 'REJECTED');
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function _postExpenseToLedger(opts: {
  workspaceId: string;
  expenseId: string;
  category: string;
  amount: number;
  title: string;
  vendorName?: string;
}): Promise<void> {
  try {
    await ensureCoa(opts.workspaceId);
    await postLedgerEntry({
      workspace_id:        opts.workspaceId,
      debit_account_code:  getExpenseAccountCode(opts.category),
      credit_account_code: '1010',
      amount:              opts.amount,
      description:         `Expense Voucher: ${opts.title} (${opts.vendorName ?? 'Payee'})`,
      reference_id:        opts.expenseId,
    });
  } catch (err) {
    console.error('[ExpenseService] Ledger posting failed:', err);
    // Non-fatal: status is already updated; ledger can be backfilled
  }
}
