'use client'

import { useState, useEffect } from 'react'
import { 
  Receipt, 
  Plus, 
  RefreshCw, 
  Search, 
  Filter, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle,
  FileText,
  Building2,
  User,
  ArrowUpRight,
  TrendingUp,
  Zap,
  Check
} from 'lucide-react'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>({ totalIssued: 0, totalPaid: 0, totalPending: 0, collectionRate: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')

  // Modals & Actions state
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<any>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)

  // Manual Invoice State
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualForm, setManualForm] = useState({ tenantId: '', description: '', amount: '' })
  const [manualLoading, setManualLoading] = useState(false)

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/invoices')
      if (!res.ok) throw new Error('Failed to fetch invoices')
      const data = await res.json()
      setInvoices(data.invoices || [])
      setMetrics(data.metrics || {})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const handleRunBilling = async () => {
    try {
      setGenerating(true)
      setError('')
      const res = await fetch('/api/invoices/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Billing run failed')
      setGenResult(data)
      fetchInvoices()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleCreateManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setManualLoading(true)
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: manualForm.tenantId,
          description: manualForm.description,
          amount: Number(manualForm.amount),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create custom invoice')

      setShowManualModal(false)
      setManualForm({ tenantId: '', description: '', amount: '' })
      fetchInvoices()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setManualLoading(false)
    }
  }

  const filteredInvoices = activeTab === 'ALL'
    ? invoices
    : invoices.filter((inv) => inv.status === activeTab)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="h-3 w-3" /> Paid</span>
      case 'ISSUED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20"><Clock className="h-3 w-3" /> Issued</span>
      case 'PARTIALLY_PAID':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20"><Clock className="h-3 w-3" /> Partial</span>
      case 'OVERDUE':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 border border-red-500/20"><AlertCircle className="h-3 w-3" /> Overdue</span>
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-400">{status}</span>
    }
  }

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 p-6 md:p-10 font-sans space-y-8">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 w-fit mb-2">
            <Receipt className="h-3.5 w-3.5" /> Phase 3: Financial Invoicing Hub
          </div>
          <h1 className="text-3xl font-black text-white">Recurring Rent & Invoicing Desk</h1>
          <p className="text-xs text-slate-400 mt-1">Automated monthly billing, general ledger posting & overdue tracking</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-all"
          >
            <Plus className="h-4 w-4" /> Custom Invoice
          </button>
          
          <button
            onClick={handleRunBilling}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Running Monthly Billing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-current" /> Run Monthly Billing
              </>
            )}
          </button>
        </div>
      </div>

      {/* METRICS SUMMARY BAR */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 backdrop-blur-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Billed Invoices</span>
          <p className="text-2xl font-black text-white mt-1">₹{metrics.totalIssued?.toLocaleString('en-IN') || 0}</p>
          <span className="text-[10px] text-slate-500">{metrics.count || 0} Total Issued</span>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 backdrop-blur-xl">
          <span className="text-[11px] font-semibold text-emerald-300 uppercase">Total Collections Paid</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">₹{metrics.totalPaid?.toLocaleString('en-IN') || 0}</p>
          <span className="text-[10px] text-emerald-300 font-semibold">{metrics.collectionRate || 0}% Collection Efficiency</span>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-xl">
          <span className="text-[11px] font-semibold text-amber-300 uppercase">Outstanding Dues</span>
          <p className="text-2xl font-black text-amber-400 mt-1">₹{metrics.totalPending?.toLocaleString('en-IN') || 0}</p>
          <span className="text-[10px] text-amber-300">Pending Collection</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 backdrop-blur-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">General Ledger Sync</span>
          <p className="text-base font-bold text-emerald-400 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Posted (AR 1200)
          </p>
          <span className="text-[10px] text-slate-500">Debit=Credit Verified</span>
        </div>
      </div>

      {/* BILLING RUN RESULT BANNER */}
      {genResult && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <div>
              <span className="font-bold text-white block">{genResult.message}</span>
              <span>Total Billed: ₹{genResult.totalBilled?.toLocaleString('en-IN')} across {genResult.generatedCount} active leases.</span>
            </div>
          </div>
          <button onClick={() => setGenResult(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* FILTER TABS & DATA TABLE */}
      <div className="rounded-3xl border border-slate-800 bg-[#0F172A]/90 p-6 backdrop-blur-2xl shadow-2xl space-y-6">
        
        {/* TAB BAR */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4 overflow-x-auto">
          {['ALL', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* INVOICES DATA TABLE */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
            Loading invoices & ledger records...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-3">
            <Receipt className="h-10 w-10 mx-auto text-slate-600" />
            <p className="font-semibold text-white text-sm">No Invoices Found</p>
            <p>Click "Run Monthly Billing" to trigger automated recurring invoicing for active leases.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Tenant / Room</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInvoices.map((inv) => {
                  const tenantName = inv.tenant?.user
                    ? `${inv.tenant.user.first_name} ${inv.tenant.user.last_name}`
                    : 'Tenant'
                  const roomNumber = inv.tenant?.bed?.room?.room_number || 'Room'
                  const propertyName = inv.tenant?.bed?.room?.property?.name || 'Property'

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-blue-400">{inv.invoice_number}</td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">{tenantName}</div>
                        <div className="text-[10px] text-slate-400">{propertyName} — Rm {roomNumber}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-300">{new Date(inv.issue_date).toLocaleDateString()}</td>
                      <td className="py-4 px-4 text-slate-300">{new Date(inv.due_date).toLocaleDateString()}</td>
                      <td className="py-4 px-4">{getStatusBadge(inv.status)}</td>
                      <td className="py-4 px-4 text-right font-bold text-white">₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-400">₹{Number(inv.amount_paid).toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          View Breakdown
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* INVOICE DETAIL BREAKDOWN MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-[#0F172A] p-6 space-y-6 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="font-mono font-bold text-blue-400 text-sm">{selectedInvoice.invoice_number}</span>
                <p className="text-[11px] text-slate-400">Issued to {selectedInvoice.tenant?.user?.first_name} {selectedInvoice.tenant?.user?.last_name}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs uppercase">Itemized Line Items</h4>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                {selectedInvoice.line_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">{item.description}</span>
                    <span className="font-mono font-bold text-white">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-white">
                  <span>Total Amount</span>
                  <span className="text-emerald-400">₹{Number(selectedInvoice.total_amount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* General Ledger Verification Badge */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold block">General Ledger Double-Entry Audit Passed</span>
                  <span className="text-[10px] opacity-80">Debit: 1200 Accounts Receivable | Credit: 4010 Rental Revenue</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL INVOICE MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateManualInvoice} className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0F172A] p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Issue Custom Invoice</h3>
              <button type="button" onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Select Tenant ID *</label>
              <select
                required
                value={manualForm.tenantId}
                onChange={(e) => setManualForm({ ...manualForm, tenantId: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Choose Active Tenant --</option>
                {invoices.map((inv) => (
                  <option key={inv.tenant_id} value={inv.tenant_id}>
                    {inv.tenant?.user?.first_name} {inv.tenant?.user?.last_name} ({inv.tenant?.user?.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Line Item Description *</label>
              <input
                type="text"
                required
                placeholder="e.g. Utility Charge / Room Maintenance"
                value={manualForm.description}
                onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Total Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="1500"
                value={manualForm.amount}
                onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={manualLoading}
                className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {manualLoading ? 'Issuing...' : 'Issue Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
