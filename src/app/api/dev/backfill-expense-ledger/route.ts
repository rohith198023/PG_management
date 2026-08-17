/**
 * @route /api/dev/backfill-expense-ledger
 * DEV ONLY: Retroactively post ledger entries for all APPROVED expenses
 * that were approved before the ledger posting fix.
 *
 * OCP: Uses EXPENSE_CATEGORY_ACCOUNT_MAP from the single source of truth
 *   in @/lib/ledger/posting — no duplicate category maps here.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { postLedgerEntry, getExpenseAccountCode } from '@/lib/ledger/posting';
import { initializeWorkspaceLedgerAccounts }        from '@/lib/ledger/coa';

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;

    await initializeWorkspaceLedgerAccounts(workspaceId);

    const approvedExpenses = await prisma.$queryRawUnsafe(
      `SELECT id, title, category, amount, vendor_name FROM "Expense"
       WHERE workspace_id::text = $1 AND status = 'APPROVED'`,
      String(workspaceId)
    ) as any[];

    // Find already-posted expense IDs to avoid double-posting
    const alreadyPosted = new Set<string>();
    if (approvedExpenses.length > 0) {
      const existingEntries = await prisma.ledgerJournalEntry.findMany({
        where: {
          workspace_id: workspaceId,
          reference_id: { in: approvedExpenses.map((e: any) => String(e.id)) },
        },
        select: { reference_id: true },
      });
      existingEntries.forEach((e) => alreadyPosted.add(e.reference_id));
    }

    let posted  = 0;
    let skipped = 0;
    const results: any[] = [];

    for (const exp of approvedExpenses) {
      const expId  = String(exp.id);
      const amount = Number(exp.amount || 0);

      if (alreadyPosted.has(expId)) {
        skipped++;
        results.push({ id: expId, title: exp.title, status: 'ALREADY_POSTED' });
        continue;
      }

      if (amount <= 0) {
        skipped++;
        results.push({ id: expId, title: exp.title, status: 'SKIPPED_ZERO_AMOUNT' });
        continue;
      }

      const category  = String(exp.category || 'OTHER');
      // OCP: single source of truth — no local map here
      const debitCode = getExpenseAccountCode(category);

      try {
        await postLedgerEntry({
          workspace_id:        workspaceId,
          debit_account_code:  debitCode,
          credit_account_code: '1010',
          amount,
          description:  `[Backfill] Approved Expense: ${exp.title} (${exp.vendor_name || 'Payee'})`,
          reference_id: expId,
        });
        posted++;
        results.push({ id: expId, title: exp.title, amount, debitCode, status: 'POSTED' });
      } catch (e: any) {
        results.push({ id: expId, title: exp.title, status: 'ERROR', error: e.message });
      }
    }

    return NextResponse.json({
      success: true,
      summary: { total: approvedExpenses.length, newlyPosted: posted, alreadyPosted: skipped },
      results,
    });
  } catch (error: any) {
    console.error('[Backfill] Ledger backfill error:', error);
    return NextResponse.json({ error: error.message || 'Backfill failed' }, { status: 500 });
  }
}
