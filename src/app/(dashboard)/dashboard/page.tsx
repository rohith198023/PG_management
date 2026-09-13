'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  IndianRupee,
  BedDouble,
  Utensils,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Wrench,
  BarChart3,
  AlertTriangle,
  Minus,
} from 'lucide-react'

function Sparkline({ data }: { data: { month: string; amount: number }[] }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map((d) => d.amount), 1)
  const width = 240
  const height = 56
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 12) + 6
    const y = height - 8 - ((d.amount / max) * (height - 16))
    return `${x},${y}`
  })
  const polyline = pts.join(' ')
  const area = `6,${height - 8} ${polyline} ${width - 6},${height - 8}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-14" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkGrad)" />
      <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 12) + 6
        const y = height - 8 - ((d.amount / max) * (height - 16))
        return <circle key={i} cx={x} cy={y} r="3" fill="#818cf8" />
      })}
    </svg>
  )
}

function AgingBar({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="font-mono text-sm font-bold text-white">₹{amount.toLocaleString('en-IN')}</span>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((res) => {
        if (!res.ok) throw new Error('API returned ' + res.status)
        return res.json()
      })
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Dashboard stats fetch error:', err)
        setError(true)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-72 rounded-xl bg-slate-800/60" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-800/60" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-56 rounded-2xl bg-slate-800/60" />
          <div className="h-56 rounded-2xl bg-slate-800/60" />
        </div>
      </div>
    )
  }

  if (error || !stats || !stats.occupancy) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center max-w-lg mx-auto mt-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-indigo-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Dashboard Initializing</h3>
        <p className="text-xs text-slate-400">
          Make sure you are signed in with a workspace administrator account or click below to retry fetching analytics.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setLoading(true)
              setError(false)
              fetch('/api/dashboard/stats')
                .then((r) => r.json())
                .then((d) => {
                  if (d.error) throw new Error(d.error)
                  setStats(d)
                  setLoading(false)
                })
                .catch(() => {
                  setError(true)
                  setLoading(false)
                })
            }}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-950/40"
          >
            Retry Analytics
          </button>
          <Link
            href="/login"
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition-all"
          >
            Sign In Again
          </Link>
        </div>
      </div>
    )
  }

  const momDelta = stats?.financials?.momDelta ?? 0

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Property Operations Overview</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time occupancy, ledger analytics &amp; debt aging intelligence.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/payments"
            className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/25 min-h-[44px]"
          >
            <Clock className="h-4 w-4" />
            <span>Verify Proofs ({stats?.financials?.pendingProofCount || 0})</span>
          </Link>
        </div>
      </div>

      {/* ── Pending Proofs Alert ─────────────────────────────────── */}
      {stats?.financials?.pendingProofCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <p className="text-sm">
              You have <span className="font-bold">{stats.financials.pendingProofCount}</span> manual payment proof(s) waiting for verification.
            </p>
          </div>
          <Link href="/payments" className="text-xs font-bold text-amber-400 hover:text-amber-300 underline flex items-center gap-1">
            Review Queue <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* ── Primary KPI Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Revenue */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today&apos;s Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">
              ₹{stats?.financials?.todayRevenue?.toLocaleString('en-IN') || '0'}
            </span>
            <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Verified ledger posted
            </p>
          </div>
        </div>

        {/* Collection Efficiency */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collection Rate</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">{stats?.financials?.collectionEfficiency ?? 0}%</span>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800">
              <div
                className="h-1.5 rounded-full bg-indigo-500 transition-all duration-700"
                style={{ width: `${stats?.financials?.collectionEfficiency ?? 0}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              ₹{(stats?.financials?.monthCollected ?? 0).toLocaleString('en-IN')} of ₹{(stats?.financials?.monthTotalBilled ?? 0).toLocaleString('en-IN')} billed
            </p>
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Dues</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">
              ₹{(stats?.financials?.pendingRent ?? 0).toLocaleString('en-IN')}
            </span>
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Across {stats?.financials?.arAging ? 'all aging buckets' : 'open invoices'}
            </p>
          </div>
        </div>

        {/* Bed Occupancy */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bed Occupancy</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <BedDouble className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">
                {stats?.occupancy?.occupancyPercentage || 0}%
              </span>
              <span className="text-xs text-slate-400">
                ({stats?.occupancy?.occupiedBeds || 0} / {stats?.occupancy?.totalBeds || 0})
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800">
              <div
                className="h-1.5 rounded-full bg-purple-500 transition-all duration-700"
                style={{ width: `${stats?.occupancy?.occupancyPercentage ?? 0}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-purple-400 font-medium">
              {stats?.occupancy?.vacantBeds || 0} Vacant · {stats?.occupancy?.maintenanceBeds || 0} Maintenance
            </p>
          </div>
        </div>
      </div>

      {/* ── Secondary Analytics Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Revenue Trend Sparkline */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-400" /> Revenue Trend
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Last 6 months verified collections</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-slate-800/80">
              {momDelta > 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              ) : momDelta < 0 ? (
                <TrendingDown className="h-4 w-4 text-rose-400" />
              ) : (
                <Minus className="h-4 w-4 text-slate-400" />
              )}
              <span className={`text-sm font-bold ${momDelta > 0 ? 'text-emerald-400' : momDelta < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {momDelta > 0 ? '+' : ''}{momDelta}% MoM
              </span>
            </div>
          </div>

          <div className="mt-4">
            <Sparkline data={stats?.revenueTrend ?? []} />
            <div className="flex justify-between mt-2">
              {(stats?.revenueTrend ?? []).map((d: any) => (
                <div key={d.month} className="text-center">
                  <p className="text-[10px] text-slate-500">{d.month.slice(5)}</p>
                  <p className="text-xs font-semibold text-slate-300 font-mono">
                    {d.amount >= 100000
                      ? `₹${(d.amount / 100000).toFixed(1)}L`
                      : d.amount >= 1000
                      ? `₹${(d.amount / 1000).toFixed(0)}K`
                      : `₹${d.amount}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AR Aging Panel */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <AlertTriangle className="h-5 w-5 text-amber-400" /> AR Aging
          </h2>
          <div className="mt-4 space-y-0.5">
            <AgingBar
              label="0–30 Days"
              amount={stats?.financials?.arAging?.days1to30 ?? 0}
              color="bg-emerald-400"
            />
            <AgingBar
              label="31–60 Days"
              amount={stats?.financials?.arAging?.days31to60 ?? 0}
              color="bg-amber-400"
            />
            <AgingBar
              label="60+ Days (Critical)"
              amount={stats?.financials?.arAging?.days60plus ?? 0}
              color="bg-rose-500"
            />
          </div>
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-3">
            <p className="text-xs text-slate-400">Total Outstanding</p>
            <p className="text-xl font-extrabold text-white font-mono mt-0.5">
              ₹{(stats?.financials?.pendingRent ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tertiary Grid: Mess + Complaints + Quick Actions ─────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Mess Kitchen Headcount */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Utensils className="h-4 w-4 text-indigo-400" /> Kitchen Headcount
            </h2>
            <Link href="/meals" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              Manage →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Veg</span>
              <p className="mt-1.5 text-2xl font-black text-white">{stats?.messHeadcount?.vegCount || 0}</p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
              <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Non-Veg</span>
              <p className="mt-1.5 text-2xl font-black text-white">{stats?.messHeadcount?.nonVegCount || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 text-center">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Skip</span>
              <p className="mt-1.5 text-2xl font-black text-white">{stats?.messHeadcount?.skippedCount || 0}</p>
            </div>
          </div>
        </div>

        {/* Complaint Summary */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-400" /> Maintenance Desk
            </h2>
            <Link href="/complaints" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              View All →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-sm text-slate-300">Open Tickets</span>
              </div>
              <span className="text-sm font-bold text-rose-400">{stats?.complaints?.open ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm text-slate-300">In Progress</span>
              </div>
              <span className="text-sm font-bold text-amber-400">{stats?.complaints?.inProgress ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-slate-300">Resolved This Month</span>
              </div>
              <span className="text-sm font-bold text-emerald-400">{stats?.complaints?.resolvedThisMonth ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Operations */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <Sparkles className="h-4 w-4 text-indigo-400" /> Quick Operations
          </h2>
          <div className="space-y-2.5">
            {[
              { href: '/properties', icon: BedDouble, color: 'text-indigo-400', label: 'View Room Inventory' },
              { href: '/meals', icon: Utensils, color: 'text-emerald-400', label: "Publish Tomorrow's Menu" },
              { href: '/payments', icon: Clock, color: 'text-amber-400', label: 'Payment Verifications Queue' },
              { href: '/complaints', icon: Wrench, color: 'text-orange-400', label: 'Maintenance Tickets' },
              { href: '/accounting', icon: IndianRupee, color: 'text-purple-400', label: 'General Ledger' },
            ].map(({ href, icon: Icon, color, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-sm text-slate-200 hover:bg-slate-800 hover:border-slate-700 transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${color}`} />
                  {label}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
