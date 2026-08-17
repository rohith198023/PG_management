'use client'

import { useEffect, useState } from 'react'
import { Utensils, IndianRupee, Upload, CheckCircle2, Clock, ShieldCheck, User } from 'lucide-react'

export default function TenantPortalPage() {
  const [profile, setProfile] = useState<any>(null)
  const [menus, setMenus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [proofImage, setProofImage] = useState('')
  const [utrNumber, setUtrNumber] = useState('')
  const [claiming, setClaiming] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setProfile(data)
        return fetch(`/api/meals/menu?date=${todayStr}`)
      })
      .then((res) => res.json())
      .then((data) => {
        setMenus(data.menus || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleMealSelection = async (menuId: string, choice: 'VEG' | 'NON_VEG' | 'SKIP') => {
    try {
      const res = await fetch('/api/meals/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId, choice }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to select meal')

      alert('Meal selection recorded! 🍽️')
      // Refresh menus
      const freshRes = await fetch(`/api/meals/menu?date=${todayStr}`)
      const freshData = await freshRes.json()
      setMenus(freshData.menus || [])
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleSubmitProof = async () => {
    if (!proofImage) {
      alert('Please enter a proof image URL or screenshot link.');
      return;
    }
    setClaiming(true);
    try {
      const invRes = await fetch('/api/tenant/invoices');
      const invData = await invRes.json();
      const unpaid = (invData.invoices || []).find((i: any) => i.status !== 'PAID') || invData.invoices?.[0];

      if (!unpaid) {
        throw new Error('No invoice found to attach payment proof. Please ask manager to issue an invoice.');
      }

      const res = await fetch('/api/payments/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: unpaid.id,
          proofImageUrl: proofImage,
          utrNumber: utrNumber || undefined,
          notes: 'Submitted via Tenant Portal',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit proof');

      alert('Payment proof uploaded successfully! Sent to Manager Verification Queue.');
      setProofImage('');
      setUtrNumber('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 animate-pulse">Loading tenant portal...</div>
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Banner */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/40 p-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <span>PG Resident Portal</span>
              <span>•</span>
              <span>Workspace: {profile?.workspace?.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1 sm:text-3xl">
              Welcome back, {profile?.user?.first_name || 'Resident'}! 👋
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage your daily mess meals, view monthly invoices, pay rent online, or upload payment proofs.
            </p>
          </div>

          <div className="flex items-center space-x-3 rounded-xl bg-slate-900/80 p-3 border border-slate-800 shrink-0">
            <User className="h-8 w-8 text-indigo-400" />
            <div>
              <p className="text-xs font-bold text-white">{profile?.user?.first_name} {profile?.user?.last_name}</p>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300">
                ACTIVE RESIDENT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mess Menu Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Utensils className="h-5 w-5 text-indigo-400" />
            <span>Today's Mess Meal Cutoff Selection</span>
          </h2>
          <span className="text-xs font-semibold text-slate-400">Per-meal decision</span>
        </div>

        {menus.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-400 text-xs">
            No active meal menu published for today.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menus.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">{m.slot}</span>
                  <span className="text-[10px] text-amber-400 flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Cutoff: {new Date(m.cutoff_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{m.title}</h3>
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => handleMealSelection(m.id, 'VEG')}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-600/40"
                  >
                    Veg
                  </button>
                  <button
                    onClick={() => handleMealSelection(m.id, 'NON_VEG')}
                    className="flex-1 py-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold hover:bg-rose-600/40"
                  >
                    Non-Veg
                  </button>
                  <button
                    onClick={() => handleMealSelection(m.id, 'SKIP')}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Payment Proof Form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Upload className="h-5 w-5 text-indigo-400" />
            <span>Upload Payment Proof ("I've Already Paid")</span>
          </h2>
          <span className="text-xs text-amber-400 font-semibold flex items-center space-x-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Requires Manager Approval</span>
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Paid rent via direct bank transfer, UPI, or cash? Upload your payment confirmation screenshot and UTR number below.
        </p>

        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Proof Image URL / Screenshot</label>
            <input
              type="text"
              value={proofImage}
              onChange={(e) => setProofImage(e.target.value)}
              placeholder="https://my-storage.com/receipt.jpg"
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">UTR / Bank Transaction Reference Number</label>
            <input
              type="text"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="420819203910"
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleSubmitProof}
            disabled={claiming}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 shadow-lg min-h-[44px] transition-all"
          >
            {claiming ? 'Submitting & Scanning OCR...' : 'Submit Proof for Manager Approval'}
          </button>
        </div>
      </div>
    </div>
  )
}
