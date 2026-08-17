/**
 * @module ledger/posting
 * Double-entry journal posting engine.
 *
 * Single Responsibility: Only handles writing balanced journal entries.
 * Open/Closed: Add new expense categories by extending EXPENSE_CATEGORY_ACCOUNT_MAP —
 *   no existing posting logic needs to change.
 */

import { prisma } from '@/lib/prisma';
import { initializeWorkspaceLedgerAccounts } from './coa';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LedgerPosting {
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
}

export interface PostLedgerEntryOpts {
  workspace_id: string;
  debit_account_code: string;
  credit_account_code: string;
  amount: number;
  description: string;
  reference_id: string;
}

// ─── OCP: Single source of truth for category → ledger account mapping ────────
// To add a new expense category: add one line here. Nothing else changes.

export const EXPENSE_CATEGORY_ACCOUNT_MAP: Record<string, string> = {
  MAINTENANCE:  '5010',
  UTILITIES:    '5020',
  INTERNET:     '5030',
  SALARY:       '5040',
  GATEWAY_FEE:  '5050',
  FOOD_MESS:    '5060',
  SUPPLIES:     '5070',
  TAX:          '5070',
  REFUND:       '5070',
  OTHER:        '5070',
};

/**
 * Returns the ledger debit account code for an expense category.
 * Falls back to '5070' (General & Administrative Expense) for unknown categories.
 */
export function getExpenseAccountCode(category: string): string {
  return EXPENSE_CATEGORY_ACCOUNT_MAP[category] ?? '5070';
}

// ─── Core Posting Engine ──────────────────────────────────────────────────────

/**
 * Posts a set of balanced double-entry journal entries.
 * Validates Sum(Debits) === Sum(Credits) before writing.
 *
 * @throws Error if entries are not balanced
 */
export async function postJournalEntries(
  workspaceId: string,
  referenceId: string,
  postings: LedgerPosting[]
): Promise<void> {
  const totalDebits  = postings.reduce((sum, p) => sum + p.debit,  0);
  const totalCredits = postings.reduce((sum, p) => sum + p.credit, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    throw new Error(
      `Double-entry balance check failed: Debits (₹${totalDebits}) ≠ Credits (₹${totalCredits})`
    );
  }

  await initializeWorkspaceLedgerAccounts(workspaceId);

  const entriesToCreate: any[] = [];

  for (const posting of postings) {
    const account = await prisma.ledgerAccount.findUnique({
      where: { workspace_id_code: { workspace_id: workspaceId, code: posting.accountCode } },
    });

    if (!account) {
      throw new Error(
        `Ledger account code ${posting.accountCode} not found for workspace ${workspaceId}`
      );
    }

    entriesToCreate.push({
      workspace_id:   workspaceId,
      account_id:     account.id,
      reference_id:   referenceId,
      debit_amount:   posting.debit,
      credit_amount:  posting.credit,
      description:    posting.description,
    });
  }

  await prisma.ledgerJournalEntry.createMany({ data: entriesToCreate });
}

/**
 * Convenience helper: posts a balanced 2-account double-entry transaction.
 *
 * Example — record a cash expense:
 *   DEBIT  5020 Electricity Expense  ₹4,567
 *   CREDIT 1010 Operating Cash       ₹4,567
 */
export async function postLedgerEntry(opts: PostLedgerEntryOpts): Promise<void> {
  // Normalise legacy account code alias
  const debitCode  = opts.debit_account_code  === '1200' ? '1030' : opts.debit_account_code;
  const creditCode = opts.credit_account_code === '1200' ? '1030' : opts.credit_account_code;

  return postJournalEntries(opts.workspace_id, opts.reference_id, [
    { accountCode: debitCode,  debit: opts.amount, credit: 0,           description: opts.description },
    { accountCode: creditCode, debit: 0,           credit: opts.amount, description: opts.description },
  ]);
}
