/**
 * @module ledger/reports
 * Financial statement generators: Trial Balance, P&L, Balance Sheet.
 *
 * Single Responsibility: Only generates read-only financial reports.
 * Open/Closed: New report types can be added without modifying existing generators.
 */

import { prisma } from '@/lib/prisma';
import { initializeWorkspaceLedgerAccounts } from './coa';

// ─── Shared date filter helper ────────────────────────────────────────────────

function buildDateFilter(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return {};
  return {
    posted_at: {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate   ? { lte: new Date(endDate)   } : {}),
    },
  };
}

// ─── Trial Balance ────────────────────────────────────────────────────────────

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: string;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  grandTotalDebit: number;
  grandTotalCredit: number;
  isBalanced: boolean;
}

/**
 * Generates a Trial Balance Statement.
 * Verifies Sum(All Debits) === Sum(All Credits) across every active account.
 */
export async function getTrialBalanceStatement(
  workspaceId: string,
  startDate?: string,
  endDate?: string
): Promise<TrialBalanceResult> {
  await initializeWorkspaceLedgerAccounts(workspaceId);

  const accounts = await prisma.ledgerAccount.findMany({
    where: { workspace_id: workspaceId },
    include: { journal_entries: { where: buildDateFilter(startDate, endDate) } },
    orderBy: { code: 'asc' },
  });

  let grandTotalDebit  = 0;
  let grandTotalCredit = 0;

  const rows: TrialBalanceRow[] = accounts.map((acc) => {
    const totalDebit  = acc.journal_entries.reduce((s, e) => s + Number(e.debit_amount),  0);
    const totalCredit = acc.journal_entries.reduce((s, e) => s + Number(e.credit_amount), 0);
    grandTotalDebit  += totalDebit;
    grandTotalCredit += totalCredit;

    const isNormalDebit = acc.type === 'ASSET' || acc.type === 'EXPENSE';

    return {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      totalDebit,
      totalCredit,
      netBalance: isNormalDebit ? totalDebit - totalCredit : totalCredit - totalDebit,
    };
  });

  return {
    rows,
    grandTotalDebit,
    grandTotalCredit,
    isBalanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
  };
}

// ─── Profit & Loss ────────────────────────────────────────────────────────────

export interface PnLRow {
  code: string;
  name: string;
  amount: number;
}

export interface PnLResult {
  revenueRows: PnLRow[];
  expenseRows: PnLRow[];
  totalGrossRevenue: number;
  totalOperatingExpenses: number;
  netOperatingProfit: number;
  profitMarginPercent: number;
}

/**
 * Generates a Profit & Loss (Income) Statement for the given period.
 */
export async function getProfitAndLossStatement(
  workspaceId: string,
  startDate?: string,
  endDate?: string
): Promise<PnLResult> {
  await initializeWorkspaceLedgerAccounts(workspaceId);

  const accounts = await prisma.ledgerAccount.findMany({
    where: { workspace_id: workspaceId, type: { in: ['REVENUE', 'EXPENSE'] } },
    include: { journal_entries: { where: buildDateFilter(startDate, endDate) } },
    orderBy: { code: 'asc' },
  });

  let totalGrossRevenue      = 0;
  let totalOperatingExpenses = 0;
  const revenueRows: PnLRow[] = [];
  const expenseRows: PnLRow[] = [];

  accounts.forEach((acc) => {
    const totalDebit  = acc.journal_entries.reduce((s, e) => s + Number(e.debit_amount),  0);
    const totalCredit = acc.journal_entries.reduce((s, e) => s + Number(e.credit_amount), 0);

    if (acc.type === 'REVENUE') {
      const net = totalCredit - totalDebit;
      totalGrossRevenue += net;
      revenueRows.push({ code: acc.code, name: acc.name, amount: net });
    } else {
      const net = totalDebit - totalCredit;
      totalOperatingExpenses += net;
      expenseRows.push({ code: acc.code, name: acc.name, amount: net });
    }
  });

  const netOperatingProfit   = totalGrossRevenue - totalOperatingExpenses;
  const profitMarginPercent  =
    totalGrossRevenue > 0
      ? Math.round((netOperatingProfit / totalGrossRevenue) * 10000) / 100
      : 0;

  return {
    revenueRows,
    expenseRows,
    totalGrossRevenue,
    totalOperatingExpenses,
    netOperatingProfit,
    profitMarginPercent,
  };
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export interface BalanceSheetRow {
  code: string;
  name: string;
  amount: number;
}

export interface BalanceSheetResult {
  assetRows: BalanceSheetRow[];
  liabilityRows: BalanceSheetRow[];
  equityRows: BalanceSheetRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

/**
 * Generates a Balance Sheet Statement as of the given end date.
 * Net Operating Profit from P&L rolls into Retained Earnings.
 */
export async function getBalanceSheetStatement(
  workspaceId: string,
  endDate?: string
): Promise<BalanceSheetResult> {
  await initializeWorkspaceLedgerAccounts(workspaceId);

  const accounts = await prisma.ledgerAccount.findMany({
    where: { workspace_id: workspaceId, type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] } },
    include: { journal_entries: { where: endDate ? { posted_at: { lte: new Date(endDate) } } : {} } },
    orderBy: { code: 'asc' },
  });

  // Roll current-period net profit into equity
  const pnl = await getProfitAndLossStatement(workspaceId, undefined, endDate);

  let totalAssets      = 0;
  let totalLiabilities = 0;
  let totalEquity      = pnl.netOperatingProfit;

  const assetRows:     BalanceSheetRow[] = [];
  const liabilityRows: BalanceSheetRow[] = [];
  const equityRows:    BalanceSheetRow[] = [
    { code: '3020', name: 'Current Period Net Earnings (Retained)', amount: pnl.netOperatingProfit },
  ];

  accounts.forEach((acc) => {
    const totalDebit  = acc.journal_entries.reduce((s, e) => s + Number(e.debit_amount),  0);
    const totalCredit = acc.journal_entries.reduce((s, e) => s + Number(e.credit_amount), 0);

    if (acc.type === 'ASSET') {
      const net = totalDebit - totalCredit;
      totalAssets += net;
      assetRows.push({ code: acc.code, name: acc.name, amount: net });
    } else if (acc.type === 'LIABILITY') {
      const net = totalCredit - totalDebit;
      totalLiabilities += net;
      liabilityRows.push({ code: acc.code, name: acc.name, amount: net });
    } else {
      const net = totalCredit - totalDebit;
      totalEquity += net;
      equityRows.push({ code: acc.code, name: acc.name, amount: net });
    }
  });

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    assetRows,
    liabilityRows,
    equityRows,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
  };
}
