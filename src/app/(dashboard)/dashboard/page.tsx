'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  IndianRupee,
  BedDouble,
  Utensils,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400 animate-pulse">
        Fetching live workspace analytics...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Property Operations Overview</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time multi-tenant occupancy, general ledger dues, and mess headcount analytics.
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

      {/* Pending Proofs Alert Banner if > 0 */}
      {stats?.financials?.pendingProofCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <p className="text-sm">
              You have <span className="font-bold">{stats.financials.pendingProofCount}</span> manual payment proof screenshot(s) waiting for verification in the queue.
            </p>
          </div>
          <Link
            href="/payments"
            className="text-xs font-bold text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
          >
            Review Queue <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Today Revenue */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Revenue</span>
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

        {/* Card 2: Collected Rent */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collected Rent</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">
              ₹{stats?.financials?.collectedRent?.toLocaleString('en-IN') || '0'}
            </span>
            <p className="mt-1 text-xs text-slate-400">Total verified collections</p>
          </div>
        </div>

        {/* Card 3: Pending Rent */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Rent</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">
              ₹{stats?.financials?.pendingRent?.toLocaleString('en-IN') || '0'}
            </span>
            <p className="mt-1 text-xs text-slate-400">Excludes unverified proofs</p>
          </div>
        </div>

        {/* Card 4: Occupancy % */}
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
                ({stats?.occupancy?.occupiedBeds || 0} / {stats?.occupancy?.totalBeds || 0} Beds)
              </span>
            </div>
            <p className="mt-1 text-xs text-purple-400 font-medium">
              {stats?.occupancy?.vacantBeds || 0} Vacant Bed(s) Available
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Analytical Grid: Kitchen Mess Headcount & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Mess Kitchen Headcount Card (Section 5 Standard) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Utensils className="h-5 w-5 text-indigo-400" /> Today's Kitchen Mess Headcount
              </h2>
              <p className="text-xs text-slate-400">Live plate calculation based on confirmed tenant meal selections</p>
            </div>
            <Link href="/meals" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              Manage Menu →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Veg Plates</span>
              <p className="mt-2 text-2xl font-black text-white">{stats?.messHeadcount?.vegCount || 0}</p>
            </div>

            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-center">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Non-Veg Plates</span>
              <p className="mt-2 text-2xl font-black text-white">{stats?.messHeadcount?.nonVegCount || 0}</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Skipped</span>
              <p className="mt-2 text-2xl font-black text-white">{stats?.messHeadcount?.skippedCount || 0}</p>
            </div>
          </div>
        </div>

        {/* Quick Operations Actions */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" /> Quick Operations
          </h2>

          <div className="space-y-3">
            <Link
              href="/properties"
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-sm text-slate-200 hover:bg-slate-800 transition-all"
            >
              <span className="flex items-center gap-2.5">
                <BedDouble className="h-4 w-4 text-indigo-400" /> View Room Inventory
              </span>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </Link>

            <Link
              href="/meals"
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-sm text-slate-200 hover:bg-slate-800 transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Utensils className="h-4 w-4 text-emerald-400" /> Publish Tomorrow's Menu
              </span>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </Link>

            <Link
              href="/payments"
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-sm text-slate-200 hover:bg-slate-800 transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-amber-400" /> Payment Verifications Queue
              </span>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
