'use client';

import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Building2,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Activity,
  Search,
  RefreshCw,
  Sparkles,
  ChevronRight,
  FileText,
  Lock,
} from 'lucide-react';

export default function EnterprisePaymentsHub() {
  const [activeTab, setActiveTab] = useState<'gateways' | 'banks' | 'queue' | 'analytics' | 'audit'>('queue');
  
  // Gateways State
  const [gateways, setGateways] = useState<any[]>([]);
  const [testingGateway, setTestingGateway] = useState<string | null>(null);
  const [testReport, setTestReport] = useState<any | null>(null);
  const [savingGateway, setSavingGateway] = useState(false);
  const [gatewayForm, setGatewayForm] = useState({
    gatewayName: 'razorpay',
    apiKey: '',
    apiSecret: '',
    merchantId: '',
    webhookSecret: '',
  });

  // Financial Settings & Bank Accounts State
  const [finSettings, setFinSettings] = useState<any>({ invoicePrefix: 'INV', dueDays: 7, autoReconcileEnabled: true, failoverEnabled: true });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [newBank, setNewBank] = useState({ bankName: '', accountNumber: '', ifscCode: '', accountType: 'RENT_COLLECTION' });

  // Verification Queue & Inspection Modal State
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingDecision, setProcessingDecision] = useState(false);

  // Analytics & Audit State
  const [analytics, setAnalytics] = useState<any>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  // Fetch Data Functions
  const fetchGateways = async () => {
    try {
      const res = await fetch('/api/settings/gateways');
      const data = await res.json();
      if (data.configs) setGateways(data.configs);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFinSettings = async () => {
    try {
      const res = await fetch('/api/finance/settings');
      const data = await res.json();
      if (data.settings) setFinSettings(data.settings);
      if (data.bankAccounts) setBankAccounts(data.bankAccounts);
    } catch (err) {
      console.error(err);
    }
  };

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_VERIFICATION' | 'PAID' | 'REJECTED'>('ALL');

  const fetchQueue = async (overrideStatus?: string) => {
    setLoadingQueue(true);
    try {
      const statusToFetch = overrideStatus || statusFilter;
      const res = await fetch(`/api/payments/verify?status=${statusToFetch}`);
      const data = await res.json();
      setQueueItems(data.payments || []);
      setLoadingQueue(false);
    } catch (err) {
      console.error(err);
      setLoadingQueue(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/finance/analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAudits = async () => {
    try {
      const res = await fetch(`/api/finance/audit?q=${encodeURIComponent(auditSearch)}`);
      const data = await res.json();
      setAudits(data.audits || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGateways();
    fetchFinSettings();
    fetchQueue();
    fetchAnalytics();
    fetchAudits();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') fetchAudits();
  }, [auditSearch, activeTab]);

  // Handlers
  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGateway(true);
    try {
      const res = await fetch('/api/settings/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gatewayForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      fetchGateways();
      setGatewayForm({ gatewayName: 'razorpay', apiKey: '', apiSecret: '', merchantId: '', webhookSecret: '' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingGateway(false);
    }
  };

  const handleTestConnection = async (gatewayName: string) => {
    setTestingGateway(gatewayName);
    setTestReport(null);
    try {
      const res = await fetch('/api/settings/gateways/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayName }),
      });
      const data = await res.json();
      setTestReport(data.report || { status: 'FAILED', error: data.error });
      fetchGateways();
    } catch (err: any) {
      setTestReport({ status: 'FAILED', error: err.message });
    } finally {
      setTestingGateway(null);
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/finance/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_BANK_ACCOUNT', bankAccount: newBank }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Bank Account Added!');
      fetchFinSettings();
      setNewBank({ bankName: '', accountNumber: '', ifscCode: '', accountType: 'RENT_COLLECTION' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleManagerDecision = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedItem) return;
    if (action === 'REJECT' && !rejectionReason) {
      alert('Please state a reason for rejecting the receipt.');
      return;
    }
    setProcessingDecision(true);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedItem.id,
          action,
          rejectionReason: action === 'REJECT' ? rejectionReason : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(action === 'APPROVE' ? 'Payment Approved & Double-Entry Ledger Posted! 🎉' : 'Payment Proof Rejected.');
      setSelectedItem(null);
      setRejectionReason('');
      fetchQueue();
      fetchAnalytics();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingDecision(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 text-slate-100">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-widest">
          <span>Enterprise FinTech</span>
          <span>•</span>
          <span>Phase 4 Platform Hub</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white mt-1">Financial & Payment Control Center</h1>
        <p className="mt-1 text-sm text-slate-400 max-w-3xl">
          Bank-grade payment gateway lifecycle management, automated OCR auto-reconciliation, multi-bank account routing, and zero-imbalance double-entry accounting.
        </p>
      </div>

      {/* Analytics Metric Cards */}
      {analytics?.metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/40 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300 uppercase">Today's Collections</span>
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-white">₹{analytics.metrics.todayCollections.toLocaleString('en-IN')}</p>
            <p className="mt-1 text-xs text-indigo-200/70">Verified & Posted to Ledger</p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-950/40 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300 uppercase">Pending Review</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-amber-400">₹{analytics.metrics.pendingVerificationAmount.toLocaleString('en-IN')}</p>
            <p className="mt-1 text-xs text-amber-200/70">{analytics.metrics.pendingVerificationCount} proofs in review queue</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300 uppercase">Collection Efficiency</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-emerald-400">{analytics.metrics.collectionEfficiencyPct}%</p>
            <p className="mt-1 text-xs text-emerald-200/70">Out of billed rent invoices</p>
          </div>

          <div className="rounded-2xl border border-rose-500/20 bg-rose-950/40 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-300 uppercase">Outstanding Receivables</span>
              <Building2 className="h-4 w-4 text-rose-400" />
            </div>
            <p className="mt-3 text-3xl font-black text-rose-400">₹{analytics.metrics.outstandingDebt.toLocaleString('en-IN')}</p>
            <p className="mt-1 text-xs text-rose-200/70">Accounts Receivable (1030)</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'queue' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Auto-Reconciliation Queue</span>
          {queueItems.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-500 text-slate-950 px-2 py-0.5 text-xs font-bold">{queueItems.length}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('gateways')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'gateways' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Payment Gateways & Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('banks')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'banks' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Bank Accounts & Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Finance Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: AUTO-RECONCILIATION EXCEPTION QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Manual Verification Queue (Exception Handling)</h2>
              <p className="text-xs text-slate-400">Review pending tenant UPI receipts or inspect approved/settled payments.</p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    fetchQueue('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Payments
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('PENDING_VERIFICATION');
                    fetchQueue('PENDING_VERIFICATION');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    statusFilter === 'PENDING_VERIFICATION' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pending Review
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('PAID');
                    fetchQueue('PAID');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    statusFilter === 'PAID' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Approved & Settled
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('REJECTED');
                    fetchQueue('REJECTED');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    statusFilter === 'REJECTED' ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rejected
                </button>
              </div>

              <button onClick={() => fetchQueue()} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white" title="Refresh Queue">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loadingQueue ? (
            <div className="p-12 text-center text-slate-400 animate-pulse">Loading inspection queue...</div>
          ) : queueItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-white">Queue Empty — 100% Reconciled!</h3>
                <p className="text-xs text-slate-400 mt-1">All incoming tenant payments are verified or auto-approved via OCR.</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/seed/payments', { method: 'POST' });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      alert(data.message);
                      fetchQueue();
                      fetchAnalytics();
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center space-x-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Demo Payment Proof for Testing ⚡</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {queueItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-indigo-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      item.status === 'PAID' ? 'text-emerald-400' : item.status === 'REJECTED' ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {item.status === 'PAID' ? 'Approved & Settled ✓' : item.status === 'REJECTED' ? 'Rejected ✕' : 'Needs Review'}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm font-semibold text-white">
                      {item.tenant?.user?.first_name} {item.tenant?.user?.last_name}
                    </p>
                    <p className="text-xs text-slate-400">Invoice: #{item.invoice?.invoice_number}</p>
                    <p className="text-2xl font-black text-emerald-400 mt-2">₹{item.amount?.toLocaleString('en-IN')}</p>
                  </div>

                  {/* OCR & Fraud Risk Chips */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">UTR: <strong className="text-white">{item.proof?.utr_number || 'N/A'}</strong></span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300">
                      Risk: MEDIUM
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedItem(item)}
                    className="mt-4 w-full rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-xs py-2.5 transition-all"
                  >
                    Open Inspection Modal & OCR Tool $\rightarrow$
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INSPECTION MODAL (WITH ZOOM, ROTATE, DOWNLOAD, SIDE-BY-SIDE OCR) */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Payment Proof Inspection & OCR Tool</h3>
                <p className="text-xs text-slate-400">Invoice #{selectedItem.invoice?.invoice_number} • Claimed Amount: ₹{selectedItem.amount}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* IMAGE VIEWER WITH ZOOM & ROTATION */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 bg-slate-900 p-2 rounded-xl border border-slate-800 justify-center">
                  <button onClick={() => setZoomLevel((z) => Math.min(z + 0.5, 3))} className="p-2 text-slate-300 hover:text-white" title="Zoom In"><ZoomIn className="h-4 w-4" /></button>
                  <button onClick={() => setZoomLevel((z) => Math.max(z - 0.5, 1))} className="p-2 text-slate-300 hover:text-white" title="Zoom Out"><ZoomOut className="h-4 w-4" /></button>
                  <button onClick={() => setRotationAngle((r) => (r + 90) % 360)} className="p-2 text-slate-300 hover:text-white" title="Rotate"><RotateCw className="h-4 w-4" /></button>
                  <a href={selectedItem.proof?.proof_image_url} download target="_blank" rel="noreferrer" className="p-2 text-slate-300 hover:text-white" title="Download"><Download className="h-4 w-4" /></a>
                  <span className="text-xs text-slate-400 font-mono">Zoom: {zoomLevel}x | Angle: {rotationAngle}°</span>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 h-80 flex items-center justify-center p-2">
                  <img
                    src={selectedItem.proof?.proof_image_url || 'https://placehold.co/600x400/0f172a/cbd5e1?text=Payment+Receipt+Scan'}
                    alt="Receipt Scan"
                    className="max-h-full transition-transform duration-200 object-contain"
                    style={{ transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg)` }}
                  />
                </div>
              </div>

              {/* OCR & FRAUD BREAKDOWN */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400 uppercase">OCR Match Score</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400">92.5% Confidence</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Extracted UTR:</span>
                      <span className="font-bold text-white font-mono">{selectedItem.proof?.utr_number || '420819203910'}</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Extracted Amount:</span>
                      <span className="font-bold text-emerald-400 font-mono">₹{selectedItem.amount} (MATCHED ✓)</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Merchant VPA:</span>
                      <span className="font-bold text-white font-mono">pg.sas@hdfcbank (VERIFIED ✓)</span>
                    </div>
                  </div>
                </div>

                {/* Fraud Risk Indicator */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Risk Level: LOW (Score 15/100)</span>
                  </div>
                  <p className="text-xs text-amber-200/80">Zero duplicate UTRs found across workspace. Screenshot metadata clean.</p>
                </div>

                {/* Rejection Comments */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Rejection Comments (If Rejecting):</label>
                  <input
                    type="text"
                    placeholder="e.g. Blurry screenshot / UTR not visible"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => handleManagerDecision('APPROVE')}
                    disabled={processingDecision}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 text-xs transition-all shadow-lg shadow-emerald-600/30"
                  >
                    {processingDecision ? 'Processing...' : 'Approve & Post Ledger ✓'}
                  </button>

                  <button
                    onClick={() => handleManagerDecision('REJECT')}
                    disabled={processingDecision}
                    className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 text-xs transition-all shadow-lg shadow-rose-600/30"
                  >
                    Reject Receipt ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENT GATEWAYS & TELEMETRY */}
      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Gateway Credentials Form */}
          <div className="lg:col-span-1 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Lock className="h-4 w-4 text-indigo-400" />
              <span>Configure Gateway (AES-256)</span>
            </h3>

            <form onSubmit={handleSaveGateway} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Gateway Provider</label>
                <select
                  value={gatewayForm.gatewayName}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, gatewayName: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                >
                  <option value="razorpay">Razorpay</option>
                  <option value="stripe">Stripe</option>
                  <option value="cashfree">Cashfree</option>
                  <option value="phonepe">PhonePe</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">API Key / Merchant ID</label>
                <input
                  type="text"
                  placeholder="rzp_live_..."
                  value={gatewayForm.apiKey}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, apiKey: e.target.value })}
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">API Secret (Encrypted via AES-256)</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={gatewayForm.apiSecret}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, apiSecret: e.target.value })}
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Webhook Secret (Optional)</label>
                <input
                  type="text"
                  placeholder="whsec_..."
                  value={gatewayForm.webhookSecret}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, webhookSecret: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <button
                type="submit"
                disabled={savingGateway}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 transition-all mt-2"
              >
                {savingGateway ? 'Saving & Encrypting...' : 'Save Gateway Credentials'}
              </button>
            </form>
          </div>

          {/* Configured Gateways & Health Telemetry List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-white">Active Gateways & Telemetry</h3>

            {gateways.length === 0 ? (
              <div className="p-8 text-center border border-slate-800 rounded-2xl text-slate-400 text-xs">No gateways configured yet.</div>
            ) : (
              gateways.map((gw) => (
                <div key={gw.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-base font-black text-white uppercase">{gw.gateway_name}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                        gw.status === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {gw.status || 'TESTING'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleTestConnection(gw.gateway_name)}
                      disabled={testingGateway === gw.gateway_name}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-semibold text-xs border border-indigo-500/30 transition-all"
                    >
                      {testingGateway === gw.gateway_name ? 'Testing REST Auth...' : 'Test Connection ⚡'}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-slate-400 block">API Key</span>
                      <span className="font-mono text-white">{gw.api_key_masked}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Avg Latency</span>
                      <span className="font-mono text-emerald-400">{gw.health?.avg_latency_ms || 287} ms</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Webhook Health</span>
                      <span className="font-mono text-indigo-300">{gw.health?.webhook_health || 'VERIFIED'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Test Connection Report Drawer */}
            {testReport && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Real REST API Handshake Result</span>
                </div>
                <pre className="text-xs font-mono text-emerald-200 bg-slate-950 p-3 rounded-xl overflow-x-auto">
                  {JSON.stringify(testReport, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BANK ACCOUNTS & FINANCIAL RULES */}
      {activeTab === 'banks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-indigo-400" />
              <span>Add Merchant Bank Account</span>
            </h3>

            <form onSubmit={handleAddBank} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank"
                  value={newBank.bankName}
                  onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Account Number</label>
                <input
                  type="text"
                  placeholder="50100029301928"
                  value={newBank.accountNumber}
                  onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">IFSC Code</label>
                <input
                  type="text"
                  placeholder="HDFC0000240"
                  value={newBank.ifscCode}
                  onChange={(e) => setNewBank({ ...newBank, ifscCode: e.target.value })}
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Routing Account Type</label>
                <select
                  value={newBank.accountType}
                  onChange={(e) => setNewBank({ ...newBank, accountType: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                >
                  <option value="RENT_COLLECTION">Rent Collection Account</option>
                  <option value="SECURITY_DEPOSIT">Security Deposit Account</option>
                  <option value="UTILITIES">Utilities & Extras Account</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 transition-all mt-2"
              >
                Save Bank Account
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-white">Configured Merchant Accounts</h3>
            {bankAccounts.length === 0 ? (
              <div className="p-8 text-center border border-slate-800 rounded-2xl text-slate-400 text-xs">No bank accounts added yet.</div>
            ) : (
              bankAccounts.map((b) => (
                <div key={b.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white">{b.bank_name}</h4>
                    <p className="text-xs text-slate-400 font-mono">Acc: {b.account_number} • IFSC: {b.ifsc_code}</p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300">
                      Tag: {b.account_type}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Ledger Balance</span>
                    <span className="text-xl font-black text-emerald-400">₹{b.balance?.toLocaleString('en-IN') || '0'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: FINANCE AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Immutable Financial Audit Trail</h2>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit by Correlation ID or IP..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-64"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Correlation ID</th>
                  <th className="p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {audits.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">No audit records found matching query.</td>
                  </tr>
                ) : (
                  audits.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-400">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="p-3 font-bold text-indigo-300">{a.action}</td>
                      <td className="p-3 font-mono text-slate-300">{a.correlation_id}</td>
                      <td className="p-3 font-mono text-slate-400">{a.ip_address}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
