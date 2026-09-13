'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Receipt, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Upload, 
  Building2,
  RefreshCw,
  ArrowRight
} from 'lucide-react'

export default function TenantInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTenantInvoices = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/tenant/invoices')
      if (!res.ok) throw new Error('Failed to fetch your invoices')
      const data = await res.json()
      setInvoices(data.invoices || [])
      setTenant(data.tenant || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenantInvoices()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="h-3.5 w-3.5" /> Paid</span>
      case 'ISSUED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 border border-blue-500/20"><Clock className="h-3.5 w-3.5" /> Due Soon</span>
      case 'OVERDUE':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400 border border-red-500/20"><AlertCircle className="h-3.5 w-3.5" /> Overdue</span>
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400">{status}</span>
    }
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* HEADER */}
      <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 w-fit mb-2">
            <Receipt className="h-3.5 w-3.5" /> Tenant Financial Portal
          </div>
          <h1 className="text-3xl font-black text-white">Your Rent Invoices & Dues</h1>
          <p className="text-xs text-slate-400 mt-1">View itemized monthly rent statements and submit payments</p>
        </div>

        {tenant?.bed?.room && (
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-4 text-xs">
            <span className="text-slate-400 block">Assigned Accommodation:</span>
            <span className="font-bold text-white text-sm">{tenant.bed.room.property?.name} — Room {tenant.bed.room.room_number} (Bed {tenant.bed.bed_number})</span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* INVOICES CARDS LIST */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
          Fetching your rent invoices...
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-12 text-center text-slate-400 text-xs space-y-3">
          <Receipt className="h-10 w-10 mx-auto text-slate-600" />
          <p className="font-bold text-white text-sm">No Rent Invoices Issued Yet</p>
          <p>Your upcoming monthly rent invoices will appear here once issued by property management.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const isUnpaid = inv.status === 'ISSUED' || inv.status === 'OVERDUE' || inv.status === 'PARTIALLY_PAID'

            return (
              <div key={inv.id} className="rounded-3xl border border-slate-800 bg-[#0F172A] p-6 space-y-4 backdrop-blur-xl">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-blue-400 text-base">{inv.invoice_number}</span>
                      {getStatusBadge(inv.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Due Date: {new Date(inv.due_date).toLocaleDateString()}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Amount</span>
                    <span className="text-2xl font-black text-white">₹{Number(inv.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* LINE ITEMS BREAKDOWN */}
                <div className="rounded-2xl bg-slate-900/60 p-4 space-y-2 text-xs border border-slate-800/60">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Itemized Breakdown</span>
                  {inv.line_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center text-slate-200">
                      <span>{item.description}</span>
                      <span className="font-mono font-bold text-white">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                {/* PAYMENT ACTION BUTTONS */}
                {isUnpaid && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Link
                      href="/tenant/payments"
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 text-center"
                    >
                      <CreditCard className="h-4 w-4" /> Pay Online & View Receipts Portal $\rightarrow$
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
