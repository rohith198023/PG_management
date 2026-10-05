'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, ShieldCheck, BedDouble, Mail, Phone, Copy, CheckCircle2, Clock, UserMinus, AlertTriangle } from 'lucide-react'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Move-out modal state
  const [moveOutTenant, setMoveOutTenant] = useState<any | null>(null)
  const [moveOutSubmitting, setMoveOutSubmitting] = useState(false)
  const [moveOutForm, setMoveOutForm] = useState({
    damageDeduction: 0,
    deductionNotes: '',
    refundMethod: 'BANK_TRANSFER',
  })


  // Invite Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bedId: '',
    rentAmount: 8500,
    depositAmount: 15000,
  })

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/tenants').then((res) => res.json()),
      fetch('/api/tenants/admission/invite').then((res) => res.json()),
      fetch('/api/properties').then((res) => res.json()),
    ])
      .then(([tenantData, inviteData, propData]) => {
        setTenants(tenantData.tenants || [])
        setInvites(inviteData.invites || [])
        setProperties(propData.properties || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/tenants/admission/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate admission invite')

      alert(`Tokenized Admission Link Generated!\n\nLink: ${data.publicAdmissionUrl}`)
      setShowInviteModal(false)
      fetchData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/admission/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 3000)
  }

  // Flatten available beds across properties
  const availableBeds: any[] = []
  properties.forEach((p) => {
    p.floors?.forEach((f: any) => {
      f.rooms?.forEach((r: any) => {
        r.beds?.forEach((b: any) => {
          if (b.status === 'VACANT') {
            availableBeds.push({
              id: b.id,
              label: `${p.name} • Room ${r.room_number} (Bed ${b.bed_number})`,
            })
          }
        })
      })
    })
  })

  const handleMoveOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!moveOutTenant) return
    setMoveOutSubmitting(true)
    try {
      const res = await fetch(`/api/tenants/${moveOutTenant.id}/move-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveOutForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to process move-out')
      alert(`Move-out successfully processed! Bed released back to VACANT. Net Refund: ₹${data.settlement?.netRefundable ?? 0}`)
      setMoveOutTenant(null)
      fetchData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setMoveOutSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Tenant Directory & Digital Admission</h1>
          <p className="mt-1 text-sm text-slate-400">
            Active tenant profiles, digital KYC verification records, and tokenized admission links.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          <span>New Tenant Admission Link</span>
        </button>
      </div>

      {/* Pending Admission Invites Banner */}
      {invites.length > 0 && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-6 backdrop-blur-xl space-y-4">
          <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" /> Pending Digital Admission Invites ({invites.length})
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {invites.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">{inv.first_name} {inv.last_name}</h4>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-bold">RESERVED</span>
                </div>
                <p className="text-xs text-slate-400">
                  Room {inv.bed?.room?.room_number} (Bed {inv.bed?.bed_number})
                </p>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-emerald-400 font-semibold">₹{Number(inv.rent_amount)}/mo</span>
                  <button
                    onClick={() => copyToClipboard(inv.token)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/20"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedToken === inv.token ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Tenants Directory */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 animate-pulse">Loading tenant directory...</div>
      ) : tenants.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-bold text-white">No active tenants yet</h3>
          <p className="mt-1 text-sm text-slate-400">Click "New Tenant Admission Link" to onboard your first tenant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t) => (
            <div key={t.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {t.user?.first_name} {t.user?.last_name}
                  </h3>
                  <span className="text-xs text-indigo-400 font-medium">
                    Room {t.bed?.room?.room_number || 'N/A'} (Bed {t.bed?.bed_number || 'N/A'})
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" /> KYC Verified
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="h-4 w-4 text-slate-500" /> <span>{t.user?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="h-4 w-4 text-slate-500" /> <span>{t.user?.phone}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-[11px]">
                  <span className="text-slate-400">ID Proof ({t.id_proof_type || 'Aadhaar'})</span>
                  <span className="font-mono text-indigo-300">{t.id_proof_number || '1234-XXXX'}</span>
                </div>

                {t.bed_id && (
                  <div className="pt-2 border-t border-slate-800/60 flex justify-end">
                    <button
                      onClick={() => setMoveOutTenant(t)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      Initiate Move-Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Generate Admission Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Generate Online Tenant Admission Link</h3>

            <form onSubmit={handleGenerateInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Anish"
                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Sharma"
                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="tenant@example.com"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Phone Number</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Assign Available Bed</label>
                <select
                  required
                  value={formData.bedId}
                  onChange={(e) => setFormData({ ...formData, bedId: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none text-xs"
                >
                  <option value="">-- Select Vacant Bed --</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Monthly Rent (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.rentAmount}
                    onChange={(e) => setFormData({ ...formData, rentAmount: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Security Deposit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-lg"
                >
                  Generate Link & Reserve Bed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move-Out Settlement Modal */}
      {moveOutTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-bold text-white">
                Initiate Move-Out: {moveOutTenant.user?.first_name} {moveOutTenant.user?.last_name}
              </h3>
            </div>

            <p className="text-xs text-slate-400">
              This will calculate final balances, release Bed {moveOutTenant.bed?.bed_number || 'N/A'} back to VACANT status, and terminate the lease.
            </p>

            <form onSubmit={handleMoveOutSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Damages / Maintenance Deductions (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={moveOutForm.damageDeduction}
                  onChange={(e) => setMoveOutForm({ ...moveOutForm, damageDeduction: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Deduction Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Wall painting, key replacement"
                  value={moveOutForm.deductionNotes}
                  onChange={(e) => setMoveOutForm({ ...moveOutForm, deductionNotes: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Refund Settlement Method</label>
                <select
                  value={moveOutForm.refundMethod}
                  onChange={(e) => setMoveOutForm({ ...moveOutForm, refundMethod: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="BANK_TRANSFER">Direct Bank Transfer (NEFT/IMPS)</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="ADJUSTED">Adjusted Against Dues</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setMoveOutTenant(null)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={moveOutSubmitting}
                  className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-all shadow-lg shadow-red-600/30"
                >
                  {moveOutSubmitting ? 'Processing...' : 'Confirm Move-Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

