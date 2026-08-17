/**
 * @module ledger/coa
 * Chart of Accounts (COA) data definitions and workspace initialization.
 *
 * Single Responsibility: Only manages the Chart of Accounts structure.
 * Dependency Inversion: Depends on ILedgerAccountRepository abstraction.
 */

import { prisma } from '@/lib/prisma';

export type AccountTypeType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface ChartOfAccount {
  code: string;
  name: string;
  type: AccountTypeType;
}

export const DEFAULT_CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  // ASSETS (1000 - 1999)
  { code: '1010', name: 'Operating Cash / Bank',                  type: 'ASSET' },
  { code: '1020', name: 'Merchant Gateway Clearance Account',     type: 'ASSET' },
  { code: '1030', name: 'Accounts Receivable (Tenant Rent)',      type: 'ASSET' },
  { code: '1040', name: 'Security Deposits Held in Escrow',       type: 'ASSET' },
  { code: '1050', name: 'Petty Cash Desk',                        type: 'ASSET' },

  // LIABILITIES (2000 - 2999)
  { code: '2010', name: 'Tenant Security Deposits Payable',       type: 'LIABILITY' },
  { code: '2020', name: 'GST / Tax Payable',                      type: 'LIABILITY' },
  { code: '2030', name: 'Unearned / Advance Rent Revenue',        type: 'LIABILITY' },

  // EQUITY (3000 - 3999)
  { code: '3010', name: 'Owner / Capital Equity',                 type: 'EQUITY' },
  { code: '3020', name: 'Retained Earnings',                      type: 'EQUITY' },

  // REVENUE (4000 - 4999)
  { code: '4010', name: 'Rental Revenue',                         type: 'REVENUE' },
  { code: '4020', name: 'Mess & Food Revenue',                    type: 'REVENUE' },
  { code: '4030', name: 'Utility & Maintenance Charge Income',    type: 'REVENUE' },
  { code: '4040', name: 'Late Fee Penalty Income',                type: 'REVENUE' },
  { code: '4050', name: 'Miscellaneous Income',                   type: 'REVENUE' },

  // EXPENSES (5000 - 5999)
  { code: '5010', name: 'Building Repairs & Maintenance Expense', type: 'EXPENSE' },
  { code: '5020', name: 'Electricity & Utility Expense',          type: 'EXPENSE' },
  { code: '5030', name: 'Internet & WiFi Services Expense',       type: 'EXPENSE' },
  { code: '5040', name: 'Property Staff Salary Expense',          type: 'EXPENSE' },
  { code: '5050', name: 'Payment Gateway Commission Fees',        type: 'EXPENSE' },
  { code: '5060', name: 'Mess Food Supplies Expense',             type: 'EXPENSE' },
  { code: '5070', name: 'General & Administrative Expense',       type: 'EXPENSE' },
];

/**
 * Idempotently ensures all default COA accounts exist for a workspace.
 * Safe to call multiple times — only inserts missing accounts.
 */
export async function initializeWorkspaceLedgerAccounts(workspaceId: string): Promise<void> {
  try {
    const existingAccounts = await prisma.ledgerAccount.findMany({
      where: { workspace_id: workspaceId },
      select: { code: true },
    });

    const existingCodes = new Set(existingAccounts.map((a) => a.code));
    const missingAccounts = DEFAULT_CHART_OF_ACCOUNTS.filter(
      (acc) => !existingCodes.has(acc.code)
    );

    if (missingAccounts.length > 0) {
      await prisma.ledgerAccount.createMany({
        data: missingAccounts.map((acc) => ({
          workspace_id: workspaceId,
          code: acc.code,
          name: acc.name,
          type: acc.type as any,
        })),
        skipDuplicates: true,
      });
    }
  } catch (e) {
    console.warn('[COA] Ledger account initialization warning:', e);
  }
}
