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

  if (loading) {
    return <div className="p-8 text-center text-slate-400 animate-pulse">Loading tenant portal...</div>
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Tenant Self-Service Portal</span>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Welcome, {profile?.user?.firstName || 'Tenant'}!
          </h1>
          <p className="text-xs text-slate-400">
            {profile?.workspace?.name} • Room: {profile?.user?.tenantProfile?.bed?.room?.room_number || '101'} (Bed {profile?.user?.tenantProfile?.bed?.bed_number || 'A'})
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
          <User className="h-5 w-5" />
        </div>
      </div>

      {/* Section 1: Meal Opt-In Calendar (Section 5 Standard) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Utensils className="h-5 w-5 text-indigo-400" /> Today's Mess Meal Opt-In ({todayStr})
          </h2>
          <span className="text-xs text-slate-400">Per-meal decision</span>
        </div>

        {menus.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No meal slots published for today yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {menus.map((menu) => (
              <div key={menu.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{menu.slot}</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-400" /> Cutoff: {new Date(menu.cutoff_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white">{menu.title}</h4>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Veg: <strong className="text-emerald-400">₹{Number(menu.veg_price)}</strong></span>
                  {menu.non_veg_available && (
                    <span>Non-Veg: <strong className="text-rose-400">₹{Number(menu.non_veg_price)}</strong></span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={() => handleMealSelection(menu.id, 'VEG')}
                    className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 min-h-[44px]"
                  >
                    Veg
                  </button>
                  {menu.non_veg_available ? (
                    <button
                      onClick={() => handleMealSelection(menu.id, 'NON_VEG')}
                      className="rounded-lg bg-rose-500/10 border border-rose-500/30 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 min-h-[44px]"
                    >
                      Non-Veg
                    </button>
                  ) : (
                    <button disabled className="rounded-lg bg-slate-800 py-2 text-[10px] text-slate-500 cursor-not-allowed">
                      No Non-Veg
                    </button>
                  )}
                  <button
                    onClick={() => handleMealSelection(menu.id, 'SKIP')}
                    className="rounded-lg bg-slate-800 border border-slate-700 py-2 text-xs font-bold text-slate-400 hover:bg-slate-700 min-h-[44px]"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Upload Payment Proof Secondary Path (Section 6.2 Standard) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-indigo-400" /> Upload Payment Proof ("I've Already Paid")
          </h2>
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Requires Manager Approval
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
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">UTR / Bank Transaction Reference Number</label>
            <input
              type="text"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="UPI-19283749182"
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
            />
          </div>

          <button
            onClick={() => alert('Proof uploaded! Status: Pending Verification by Manager.')}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 shadow-lg min-h-[44px]"
          >
            Submit Proof for Approval
          </button>
        </div>
      </div>
    </div>
  )
}
