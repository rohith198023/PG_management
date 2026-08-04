'use client'

import { useEffect, useState } from 'react'
import { ReceiptCheck, CheckCircle2, XCircle, Clock, Eye, AlertCircle } from 'lucide-react'

export default function PaymentsPage() {
  const [proofs, setProofs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProof, setSelectedProof] = useState<any | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchProofs = () => {
    setLoading(true)
    fetch('/api/payments/proof')
      .then((res) => res.json())
      .then((data) => {
        setProofs(data.pendingProofs || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchProofs()
  }, [])

  const handleVerify = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedProof) return

    if (action === 'REJECT' && !rejectionReason) {
      alert('Please provide a rejection reason for the tenant.')
      return
    }

    setProcessing(true)

    try {
      const res = await fetch(`/api/payments/proof/${selectedProof.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'REJECT' ? rejectionReason : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      alert(action === 'APPROVE' ? 'Payment Approved & Double-Entry Ledger Posted! 🎉' : 'Payment Proof Rejected')
      setSelectedProof(null)
      setRejectionReason('')
      fetchProofs()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Manual Payment Verifications</h1>
        <p className="mt-1 text-sm text-slate-400">
          Secondary payment path verification queue. Approved payments update tenant dues & general ledger balance.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 animate-pulse">Loading verification queue...</div>
      ) : proofs.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h3 className="mt-4 text-lg font-bold text-white">Queue is clear!</h3>
          <p className="mt-1 text-sm text-slate-400">No unverified manual payment proof screenshots pending review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {proofs.map((proof) => (
            <div key={proof.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400 ring-1 ring-amber-500/20">
                  <Clock className="h-3.5 w-3.5" /> Pending Approval
                </span>
                <span className="text-xs font-mono text-slate-400">{new Date(proof.created_at).toLocaleDateString()}</span>
              </div>

              <div>
                <p className="text-xs text-slate-400">Claimed Tenant</p>
                <h4 className="text-lg font-bold text-white">
                  {proof.payment?.tenant?.user?.first_name} {proof.payment?.tenant?.user?.last_name}
                </h4>
                <p className="text-xs text-indigo-400 font-medium">
                  Room: {proof.payment?.tenant?.bed?.room?.room_number || 'N/A'} (Bed {proof.payment?.tenant?.bed?.bed_number || 'N/A'})
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Amount Paid</span>
                  <p className="text-xl font-extrabold text-emerald-400">₹{Number(proof.payment?.amount).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">UTR Ref</span>
                  <p className="text-xs font-mono text-slate-200">{proof.utr_number || 'N/A'}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProof(proof)}
                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg min-h-[44px]"
              >
                <Eye className="h-4 w-4" />
                <span>Inspect Proof Screenshot</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inspect & Verify Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Manual Payment Proof Verification</h3>
                <p className="text-xs text-slate-400">Review claimed payment details before posting to General Ledger.</p>
              </div>
              <button
                onClick={() => setSelectedProof(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Claim Details */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-xs text-slate-400">Tenant Name</span>
                <p className="font-bold text-white">{selectedProof.payment?.tenant?.user?.first_name} {selectedProof.payment?.tenant?.user?.last_name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Claimed Amount</span>
                <p className="font-bold text-emerald-400 text-lg">₹{Number(selectedProof.payment?.amount).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">UTR / Reference Number</span>
                <p className="font-mono text-indigo-300">{selectedProof.utr_number || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Target Invoice</span>
                <p className="font-mono text-slate-200">{selectedProof.payment?.invoice?.invoice_number}</p>
              </div>
            </div>

            {/* Proof Image Display */}
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Uploaded Proof Image</span>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 flex justify-center">
                <img
                  src={selectedProof.proof_image_url}
                  alt="Payment Proof Screenshot"
                  className="max-h-80 object-contain rounded-lg"
                  onError={(e: any) => {
                    e.target.onerror = null
                    e.target.src = 'https://placehold.co/600x400/0f172a/64748b?text=Uploaded+Proof+Image'
                  }}
                />
              </div>
            </div>

            {/* Rejection Reason Input */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Rejection Reason (Mandatory if rejecting)
              </label>
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. UTR number does not match bank statement, or image blurry"
                className="block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            {/* Decision CTAs */}
            <div className="flex gap-4 border-t border-slate-800 pt-4">
              <button
                disabled={processing}
                onClick={() => handleVerify('REJECT')}
                className="flex-1 rounded-lg border border-rose-500/30 bg-rose-500/10 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition-all min-h-[44px]"
              >
                {processing ? 'Processing...' : 'Reject Payment Proof'}
              </button>
              <button
                disabled={processing}
                onClick={() => handleVerify('APPROVE')}
                className="flex-1 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/25 min-h-[44px]"
              >
                {processing ? 'Processing...' : 'Approve & Post Ledger ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
