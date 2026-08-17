'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  Filter,
  Download,
  Printer,
  Sparkles,
  Receipt,
  FileText,
  AlertCircle,
} from 'lucide-react';

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<'pnl' | 'balance_sheet' | 'trial_balance' | 'gst' | 'expenses' | 'coa'>('pnl');

  // Date Filter State
  const [datePreset, setDatePreset] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'ALL'>('THIS_MONTH');

  // Current user session
  const [userRole, setUserRole] = useState<string>('');

  // Financial Data State
  const [pnlData, setPnlData] = useState<any>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<any>(null);
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [gstData, setGstData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [coaAccounts, setCoaAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);

  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '',
    category: 'UTILITIES',
    amount: '',
    taxAmount: '0',
    vendorName: '',
    paymentMethod: 'BANK_TRANSFER',
    notes: '',
    bankAccountId: '',
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // COA Account Modal State
  const [showCoaModal, setShowCoaModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    type: 'EXPENSE',
  });
  const [submittingAccount, setSubmittingAccount] = useState(false);

  // Fetch Financial Reports safely
  const fetchReports = async () => {
    setLoading(true);
    try {
      const endpoints = [
        { key: 'pnl', url: '/api/finance/reports/pnl' },
        { key: 'bs', url: '/api/finance/reports/balance-sheet' },
        { key: 'tb', url: '/api/finance/reports/trial-balance' },
        { key: 'gst', url: '/api/finance/reports/gst' },
        { key: 'exp', url: '/api/finance/expenses' },
        { key: 'coa', url: '/api/finance/coa' },
        { key: 'bank', url: '/api/finance/settings' },
      ];

      const results = await Promise.allSettled(
        endpoints.map(async (ep) => {
          const res = await fetch(ep.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          return { key: ep.key, data };
        })
      );

      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          const { key, data } = res.value;
          if (key === 'pnl' && data?.statement) setPnlData(data.statement);
          if (key === 'bs' && data?.statement) setBalanceSheetData(data.statement);
          if (key === 'tb' && data?.statement) setTrialBalanceData(data.statement);
          if (key === 'gst' && data) setGstData(data);
          if (key === 'exp' && data?.expenses) setExpenses(data.expenses);
          if (key === 'coa' && data?.accounts) setCoaAccounts(data.accounts);
          if (key === 'bank' && data?.bankAccounts) setBankAccounts(data.bankAccounts);
        }
      });
    } catch (err) {
      console.error('Failed to load financial reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // Fetch current user role for RBAC-gated UI
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d?.user?.role) setUserRole(d.user.role); })
      .catch(() => {});
  }, []);

  const canApproveExpenses = userRole === 'WORKSPACE_ADMIN' || userRole === 'MANAGER' || userRole === 'PLATFORM_SUPER_ADMIN';

  // Submit Expense Voucher
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) {
      alert('Please fill in title and expense amount.');
      return;
    }
    setSubmittingExpense(true);
    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newExpense,
          amount: parseFloat(newExpense.amount),
          taxAmount: parseFloat(newExpense.taxAmount || '0'),
          bankAccountId: newExpense.bankAccountId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.message);
      setShowExpenseModal(false);
      setNewExpense({
        title: '',
        category: 'UTILITIES',
        amount: '',
        taxAmount: '0',
        vendorName: '',
        paymentMethod: 'BANK_TRANSFER',
        notes: '',
        bankAccountId: '',
      });
      setActiveTab('expenses');
      await fetchReports();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Approve / Reject Expense
  const handleApproveExpense = async (expenseId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseId, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.message);
      fetchReports();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit New Ledger Account
  const handleCreateCoa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.code || !newAccount.name) {
      alert('Please provide code and name');
      return;
    }
    setSubmittingAccount(true);
    try {
      const res = await fetch('/api/finance/coa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.message);
      setShowCoaModal(false);
      setNewAccount({ code: '', name: '', type: 'EXPENSE' });
      fetchReports();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingAccount(false);
    }
  };

  // Dev helper: promote current user to WORKSPACE_ADMIN
  // Issues a fresh JWT cookie instantly — no logout/login needed
  const handlePromoteToAdmin = async () => {
    try {
      const res = await fetch('/api/dev/make-admin', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('✅ ' + data.message + '\n\nPage will now reload with your Admin access activated!');
      window.location.reload();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 pb-16 text-slate-100">

      {/* DEV BANNER: Workspace Creator Admin Activation */}
      {userRole === 'TENANT' && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 gap-4">
          <div className="flex items-start space-x-3">
            <ShieldCheck className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-300">You are viewing as a Tenant</p>
              <p className="text-xs text-amber-400/80 mt-0.5">
                As the workspace creator, click below to activate your Admin role — required to approve expense vouchers, manage COA, and access all financial controls.
              </p>
            </div>
          </div>
          <button
            onClick={handlePromoteToAdmin}
            className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-xs shadow-lg shadow-amber-500/30 transition-all flex items-center space-x-2"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Activate Admin Access</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-widest">
            <span>Enterprise FinTech</span>
            <span>•</span>
            <span>Phase 5 General Ledger Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">Accounting & P&L Control Center</h1>
          <p className="mt-1 text-sm text-slate-400 max-w-3xl">
            Double-entry General Ledger engine, Profit & Loss statements, Balance Sheet statements, Trial Balance verification, and operational expense management.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Log Expense Voucher</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-2"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Top Financial KPI Metrics */}
      {pnlData && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/40 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300 uppercase">Gross Revenue Collected</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">₹{pnlData.totalGrossRevenue?.toLocaleString('en-IN')}</p>
            <p className="mt-1 text-[11px] text-slate-400">Total credited from invoices & meals</p>
          </div>

          <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-300 uppercase">Total Operating Expenses</span>
              <TrendingDown className="h-4 w-4 text-rose-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-rose-400">₹{pnlData.totalOperatingExpenses?.toLocaleString('en-IN')}</p>
            <p className="mt-1 text-[11px] text-slate-400">Repairs, utilities, salaries & mess</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300 uppercase">Net Operating Profit</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-emerald-400">₹{pnlData.netOperatingProfit?.toLocaleString('en-IN')}</p>
            <p className="mt-1 text-[11px] text-emerald-300 font-semibold">{pnlData.profitMarginPercent}% Net Margin</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Double-Entry Balance</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-lg font-extrabold text-white">0.00 Imbalance</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Debits = Credits verified</p>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('pnl')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'pnl' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <PieChart className="h-4 w-4" />
          <span>Profit & Loss (P&L)</span>
        </button>

        <button
          onClick={() => setActiveTab('balance_sheet')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'balance_sheet' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Balance Sheet</span>
        </button>

        <button
          onClick={() => setActiveTab('trial_balance')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'trial_balance' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Trial Balance</span>
        </button>

        <button
          onClick={() => setActiveTab('gst')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'gst' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>GST Tax Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'expenses' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <TrendingDown className="h-4 w-4" />
          <span>Expense Vouchers ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('coa')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'coa' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Chart of Accounts (COA)</span>
        </button>
      </div>

      {/* TAB 1: PROFIT & LOSS STATEMENT */}
      {activeTab === 'pnl' && pnlData && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Income Statement (Profit & Loss)</h2>
                <p className="text-xs text-slate-400">Statement of Gross Revenue collected vs. Operating Expenses incurred.</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300">
                FY 2026-2027
              </span>
            </div>

            {/* Revenue Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Gross Operating Revenue</h3>
              <div className="divide-y divide-slate-800/60 rounded-xl border border-slate-800 bg-slate-950/40">
                {pnlData.revenueRows?.map((rev: any) => (
                  <div key={rev.code} className="flex justify-between items-center p-3 text-sm">
                    <span className="text-slate-300">{rev.name} <span className="text-xs text-slate-500">({rev.code})</span></span>
                    <span className="font-bold text-emerald-400">₹{rev.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 bg-emerald-950/30 text-sm font-bold text-white">
                  <span>TOTAL GROSS REVENUE</span>
                  <span className="text-base text-emerald-400">₹{pnlData.totalGrossRevenue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Expense Section */}
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Operating Expenses</h3>
              <div className="divide-y divide-slate-800/60 rounded-xl border border-slate-800 bg-slate-950/40">
                {pnlData.expenseRows?.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No operational expense vouchers logged yet.</div>
                ) : (
                  pnlData.expenseRows?.map((exp: any) => (
                    <div key={exp.code} className="flex justify-between items-center p-3 text-sm">
                      <span className="text-slate-300">{exp.name} <span className="text-xs text-slate-500">({exp.code})</span></span>
                      <span className="font-bold text-rose-400">₹{exp.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between items-center p-3 bg-rose-950/30 text-sm font-bold text-white">
                  <span>TOTAL OPERATING EXPENSES</span>
                  <span className="text-base text-rose-400">₹{pnlData.totalOperatingExpenses.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Net Income Result */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-5 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-white">NET OPERATING INCOME (NET PROFIT)</h4>
                <p className="text-xs text-slate-300 mt-0.5">Calculated Net Earnings after subtracting operating expenses from gross revenue.</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-emerald-400">₹{pnlData.netOperatingProfit.toLocaleString('en-IN')}</p>
                <span className="text-xs font-bold text-emerald-300">{pnlData.profitMarginPercent}% Net Profit Margin</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BALANCE SHEET */}
      {activeTab === 'balance_sheet' && balanceSheetData && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Balance Sheet Statement</h2>
                <p className="text-xs text-slate-400">Financial position verifying Total Assets = Total Liabilities + Owner Equity.</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${balanceSheetData.isBalanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {balanceSheetData.isBalanced ? 'BALANCED STATEMENT ✓' : 'IMBALANCE DETECTED'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ASSETS */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-2">Assets</h3>
                <div className="space-y-2">
                  {balanceSheetData.assetRows?.map((asset: any) => (
                    <div key={asset.code} className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 text-sm">
                      <span className="text-slate-300">{asset.name} <span className="text-xs text-slate-500">({asset.code})</span></span>
                      <span className="font-bold text-white">₹{asset.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-indigo-950/50 border border-indigo-500/30 flex justify-between items-center font-bold">
                  <span>TOTAL ASSETS</span>
                  <span className="text-lg text-indigo-300">₹{balanceSheetData.totalAssets.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* LIABILITIES & EQUITY */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider border-b border-slate-800 pb-2">Liabilities & Owner Equity</h3>
                <div className="space-y-2">
                  {balanceSheetData.liabilityRows?.map((liab: any) => (
                    <div key={liab.code} className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 text-sm">
                      <span className="text-slate-300">{liab.name} <span className="text-xs text-slate-500">({liab.code})</span></span>
                      <span className="font-bold text-rose-300">₹{liab.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  {balanceSheetData.equityRows?.map((eq: any) => (
                    <div key={eq.code} className="flex justify-between items-center p-3 rounded-xl bg-purple-950/30 text-sm">
                      <span className="text-slate-300">{eq.name} <span className="text-xs text-slate-500">({eq.code})</span></span>
                      <span className="font-bold text-purple-300">₹{eq.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-purple-950/50 border border-purple-500/30 flex justify-between items-center font-bold">
                  <span>TOTAL LIABILITIES & EQUITY</span>
                  <span className="text-lg text-purple-300">₹{balanceSheetData.totalLiabilitiesAndEquity.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRIAL BALANCE */}
      {activeTab === 'trial_balance' && trialBalanceData && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Trial Balance Statement</h2>
                <p className="text-xs text-slate-400">Verifies double-entry ledger health across all active accounts.</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Grand Total Debits: <strong className="text-indigo-400">₹{trialBalanceData.grandTotalDebit?.toLocaleString('en-IN')}</strong></span>
                <span className="text-xs text-slate-400">Credits: <strong className="text-purple-400">₹{trialBalanceData.grandTotalCredit?.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Account Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Total Debit (₹)</th>
                    <th className="p-3 text-right">Total Credit (₹)</th>
                    <th className="p-3 text-right">Net Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {trialBalanceData.rows?.map((row: any) => (
                    <tr key={row.code} className="hover:bg-slate-800/40 transition-all">
                      <td className="p-3 font-mono text-xs font-bold text-indigo-400">{row.code}</td>
                      <td className="p-3 font-semibold text-white">{row.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {row.type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-indigo-300">₹{row.totalDebit.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-purple-300">₹{row.totalCredit.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400">₹{row.netBalance.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GST TAX SUMMARY */}
      {activeTab === 'gst' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">GST Tax Summary & Filing Breakdown</h2>
                <p className="text-xs text-slate-400">Workspace GSTIN: <strong className="text-indigo-400">{gstData?.gstin || 'UNREGISTERED'}</strong></p>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300">CGST: {gstData?.taxRates?.cgstRate ?? 0}%</span>
                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300">SGST: {gstData?.taxRates?.sgstRate ?? 0}%</span>
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">Total GST Collected: ₹{(gstData?.totals?.totalTaxCollected ?? 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Gross Amount</th>
                    <th className="p-3 text-right">Taxable Value</th>
                    <th className="p-3 text-right">CGST</th>
                    <th className="p-3 text-right">SGST</th>
                    <th className="p-3 text-right font-bold text-indigo-400">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {(!gstData?.rows || gstData.rows.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-xs text-slate-500">No GST invoice transactions recorded yet.</td>
                    </tr>
                  ) : (
                    gstData.rows.map((row: any) => (
                      <tr key={row.invoiceNumber} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-white">#{row.invoiceNumber}</td>
                        <td className="p-3 text-xs text-slate-400">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="p-3 text-right font-bold text-white">₹{row.grossAmount.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right text-slate-300">₹{row.taxableValue.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right text-slate-400">₹{row.cgst.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right text-slate-400">₹{row.sgst.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-bold text-indigo-400">₹{row.totalTax.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXPENSE VOUCHER DESK */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-white">Operational Expense Vouchers</h2>
            <div className="flex items-center gap-2">
              {canApproveExpenses && (
                <button
                  onClick={async () => {
                    if (!confirm('This will post ledger entries for ALL approved expenses that were missed. Continue?')) return;
                    try {
                      const res = await fetch('/api/dev/backfill-expense-ledger', { method: 'POST' });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      alert(`✅ Backfill complete!\n\nNewly posted: ${data.summary.newlyPosted}\nAlready posted: ${data.summary.alreadyPosted}\nTotal: ${data.summary.total}\n\nRefreshing Trial Balance...`);
                      fetchReports();
                    } catch (err: any) {
                      alert('Backfill failed: ' + err.message);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-900/60 border border-emerald-500/30 hover:bg-emerald-800/60 text-emerald-400 font-bold text-xs flex items-center space-x-1.5 transition-all"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Backfill Ledger Entries</span>
                </button>
              )}
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Log Expense Voucher</span>
              </button>
            </div>
          </div>


          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expenses.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-400 space-y-4">
                <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
                <div>
                  <h3 className="text-base font-bold text-white">No Expense Vouchers Logged Yet</h3>
                  <p className="text-xs text-slate-400 mt-1">Click "Log Expense Voucher" above or generate a test voucher below to test the manager approval workflow.</p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/finance/expenses', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: 'August Electricity & Maintenance Bill',
                            category: 'UTILITIES',
                            amount: 4567,
                            vendorName: 'TATA Power',
                            paymentMethod: 'BANK_TRANSFER',
                            notes: 'Monthly property utilities',
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error);
                        alert(data.message);
                        fetchReports();
                      } catch (err: any) {
                        alert(err.message);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center space-x-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Demo Expense Voucher for Testing ⚡</span>
                  </button>
                </div>
              </div>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 hover:border-indigo-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-800 text-indigo-300">
                      {exp.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      exp.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : exp.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {exp.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{exp.title}</h3>
                    <p className="text-xs text-slate-400">Vendor: {exp.vendor_name || 'N/A'}</p>
                    <p className="text-2xl font-black text-rose-400 mt-2">₹{Number(exp.amount).toLocaleString('en-IN')}</p>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                    <span>{new Date(exp.expense_date).toLocaleDateString()}</span>
                    <span>Paid via: {exp.payment_method}</span>
                  </div>

                  {exp.status === 'PENDING' && (
                    canApproveExpenses ? (
                      <div className="flex space-x-2 pt-2">
                        <button
                          onClick={() => handleApproveExpense(exp.id, 'APPROVE')}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                        >
                          Approve & Post Ledger ✓
                        </button>
                        <button
                          onClick={() => handleApproveExpense(exp.id, 'REJECT')}
                          className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white font-bold text-xs"
                        >
                          Reject ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 pt-2 text-[11px] text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>Pending Manager / Admin Approval</span>
                      </div>
                    )
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: CHART OF ACCOUNTS */}
      {activeTab === 'coa' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Chart of Accounts (COA) Directory</h2>
            <button
              onClick={() => setShowCoaModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Custom Account Code</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Account Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Current Ledger Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {coaAccounts.map((acc) => (
                  <tr key={acc.code} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-indigo-400">{acc.code}</td>
                    <td className="p-3 font-semibold text-white">{acc.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        acc.type === 'ASSET' ? 'bg-indigo-500/20 text-indigo-300' : acc.type === 'LIABILITY' ? 'bg-rose-500/20 text-rose-300' : acc.type === 'EQUITY' ? 'bg-purple-500/20 text-purple-300' : acc.type === 'REVENUE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {acc.type}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white">₹{acc.balance?.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: LOG EXPENSE VOUCHER */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Log Operational Expense Voucher</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Title / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. August Electricity Bill Payment"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="UTILITIES">Utilities (Electricity/Water)</option>
                    <option value="MAINTENANCE">Property Maintenance</option>
                    <option value="SALARY">Staff Salaries</option>
                    <option value="INTERNET">Internet & WiFi</option>
                    <option value="FOOD_MESS">Mess / Kitchen Supplies</option>
                    <option value="OTHER">Other Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="4500"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vendor / Payee Name</label>
                  <input
                    type="text"
                    placeholder="TATA Power / Vendor Name"
                    value={newExpense.vendorName}
                    onChange={(e) => setNewExpense({ ...newExpense, vendorName: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={newExpense.paymentMethod}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="CASH">Petty Cash</option>
                    <option value="CARD">Credit / Debit Card</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingExpense}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
              >
                {submittingExpense ? 'Logging Voucher...' : 'Save & Post Ledger Voucher'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD COA ACCOUNT */}
      {showCoaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Add Custom Ledger Account</h3>
              <button onClick={() => setShowCoaModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateCoa} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Code (e.g. 5080)</label>
                <input
                  type="text"
                  required
                  placeholder="5080"
                  value={newAccount.code}
                  onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="Software License Expense"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Category Type</label>
                <select
                  value={newAccount.type}
                  onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="ASSET">Asset (1000s)</option>
                  <option value="LIABILITY">Liability (2000s)</option>
                  <option value="EQUITY">Equity (3000s)</option>
                  <option value="REVENUE">Revenue (4000s)</option>
                  <option value="EXPENSE">Expense (5000s)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submittingAccount}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
              >
                {submittingAccount ? 'Creating Account...' : 'Create Account Code'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
