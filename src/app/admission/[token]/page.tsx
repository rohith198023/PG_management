'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Building2, ShieldCheck, UserCheck, KeyRound, Upload, CheckCircle2, Lock, ArrowRight } from 'lucide-react'

export default function PublicAdmissionPage({ params: propParams }: { params?: { token?: string } }) {
  const router = useRouter()
  const routeParams = useParams()

  // Robust token resolution: useParams() -> propParams -> window.location pathname fallback
  const rawToken = (routeParams?.token as string) || propParams?.token
  const [token, setToken] = useState<string>(rawToken || '')

  const [invite, setInvite] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [password, setPassword] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [idProofType, setIdProofType] = useState('AADHAAR')
  const [idProofNumber, setIdProofNumber] = useState('')
  const [idProofUrl, setIdProofUrl] = useState('')

  useEffect(() => {
    let resolvedToken = rawToken
    if (!resolvedToken && typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/admission\/([^/?#]+)/)
      if (match && match[1]) {
        resolvedToken = match[1]
      }
    }
    if (resolvedToken) {
      setToken(resolvedToken)
    }
  }, [rawToken])

  useEffect(() => {
    if (!token) return

    setLoading(true)
    fetch(`/api/tenants/admission/public/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setInvite(data.invite)
        }
        setLoading(false)
      })
      .catch((err) => {
        setError('Failed to load admission invite details')
        setLoading(false)
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/tenants/admission/public/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          emergencyContact,
          idProofType,
          idProofNumber,
          idProofUrl: idProofUrl || `https://storage.pg-sas.com/private-kyc/${idProofType.toLowerCase()}/${idProofNumber}.pdf`,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete digital admission')
      }

      alert('Digital Admission Completed! Redirecting to your Tenant Portal 🎉')
      router.push('/tenant')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 animate-pulse">Loading admission token...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center space-y-4">
          <Building2 className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="text-xl font-bold text-white">Invalid or Expired Invite</h2>
          <p className="text-sm text-red-300">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
            <UserCheck className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">Digital Tenant Admission</h2>
          <p className="mt-1 text-sm text-slate-400">
            Welcome to {invite?.workspaceName} • {invite?.propertyName}
          </p>
        </div>

        {/* Assigned Bed & Lease Details Banner */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400">Allocated Room</span>
            <p className="font-bold text-white text-sm">Room {invite?.roomNumber}</p>
          </div>
          <div>
            <span className="text-slate-400">Assigned Bed</span>
            <p className="font-bold text-indigo-400 text-sm">Bed {invite?.bedNumber}</p>
          </div>
          <div>
            <span className="text-slate-400">Monthly Rent</span>
            <p className="font-bold text-emerald-400 text-sm">₹{invite?.rentAmount?.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <span className="text-slate-400">Security Deposit</span>
            <p className="font-bold text-purple-400 text-sm">₹{invite?.depositAmount?.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Account Credentials */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-400" /> Account Security
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={`${invite?.firstName} ${invite?.lastName}`}
                  className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={invite?.email}
                  className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Set Account Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Emergency Contact & KYC */}
          <div className="space-y-4 border-t border-slate-800 pt-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Digital KYC Verification
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300">Emergency Contact Phone Number</label>
              <input
                type="text"
                required
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="+91 9800000000 (Parent / Guardian)"
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">ID Proof Type</label>
                <select
                  value={idProofType}
                  onChange={(e) => setIdProofType(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">ID Proof Document Number</label>
                <input
                  type="text"
                  required
                  value={idProofNumber}
                  onChange={(e) => setIdProofNumber(e.target.value)}
                  placeholder="12-digit Aadhaar / Passport No"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Upload Document Scan / Image URL</label>
              <input
                type="text"
                value={idProofUrl}
                onChange={(e) => setIdProofUrl(e.target.value)}
                placeholder="https://storage.pg-sas.com/private-kyc/aadhaar/scan.pdf"
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full justify-center items-center gap-2 rounded-lg bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50 min-h-[44px]"
          >
            {submitting ? 'Completing Admission...' : 'Confirm Admission & Sign Lease Contract ✓'}
          </button>
        </form>
      </div>
    </div>
  )
}
