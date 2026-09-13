'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  IndianRupee,
  ShieldAlert,
  Wifi,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Globe,
  ChevronRight,
} from 'lucide-react'

export default function SuperAdminOverviewPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/super-admin/workspaces').then((r) => r.json()),
      fetch('/api/super-admin/finance').then((r) => r.json()),
    ])
      .then(([wsData, finData]) => {
        setData({ ...wsData, ...finData })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-72 rounded-xl bg-slate-800/60" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-800/60" />
          ))}
        </div>
      </div>
    )
  }

  const gm = data?.globalMetrics ?? {}
  const superMetrics = data?.superAdminMetrics ?? {}
  const gatewayHealths = data?.globalGatewayHealths ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
            <h1 className="text-2xl font-bold text-white">Platform Global Overview</h1>
          </div>
          <p className="text-sm text-slate-400">
            Multi-workspace telemetry, MRR analytics, and gateway health across all tenants.
          </p>
        </div>
        <Link
          href="/super-admin/workspaces"
          className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/25"
        >
          <Building2 className="h-4 w-4" />
          Manage Workspaces
        </Link>
      </div>

      {/* Global KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Workspaces</span>
            <Globe className="h-5 w-5 text-rose-400" />
          </div>
          <p className="mt-4 text-3xl font-extrabold text-white">{gm.totalWorkspaces ?? 0}</p>
          <p className="mt-1 text-xs text-emerald-400">{gm.activeWorkspaces ?? 0} Active · <span className="text-rose-400">{gm.suspendedWorkspaces ?? 0} Suspended</span></p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform MRR</span>
            <IndianRupee className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-4 text-3xl font-extrabold text-white font-mono">
            ₹{(gm.totalMRR ?? 0).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-400" /> Last 30 days collections
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed Webhooks</span>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <p className="mt-4 text-3xl font-extrabold text-white">{superMetrics.failedWebhooksCount ?? 0}</p>
          <p className="mt-1 text-xs text-amber-400">Requires investigation</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fraud Flags</span>
            <ShieldAlert className="h-5 w-5 text-rose-400" />
          </div>
          <p className="mt-4 text-3xl font-extrabold text-white">{superMetrics.totalFraudFlagsCount ?? 0}</p>
          <p className="mt-1 text-xs text-rose-400">High-risk payment proofs</p>
        </div>
      </div>

      {/* Gateway Health Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wifi className="h-5 w-5 text-indigo-400" /> Global Gateway Health Monitor
          </h2>
          <span className="text-xs text-slate-400">{gatewayHealths.length} active gateways</span>
        </div>

        {gatewayHealths.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-sm">No gateway health data available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Workspace</th>
                  <th className="pb-3 pr-4">Gateway</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Latency</th>
                  <th className="pb-3">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {gatewayHealths.map((gh: any) => (
                  <tr key={gh.id}>
                    <td className="py-3 pr-4 text-slate-300 font-medium">{gh.workspace?.name}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-mono text-slate-300 uppercase">
                        {gh.gateway_name}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold ${
                        gh.status === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {gh.status === 'CONNECTED' ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        {gh.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-slate-300">{gh.avg_latency_ms}ms</td>
                    <td className="py-3">
                      <span className={`font-mono font-bold ${
                        gh.success_rate >= 99 ? 'text-emerald-400' : gh.success_rate >= 95 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {gh.success_rate?.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/super-admin/workspaces"
          className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:bg-slate-800/60 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600/20 text-rose-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Workspace Management</p>
              <p className="text-xs text-slate-400">Provision, suspend &amp; manage tiers</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-slate-300 transition-all" />
        </Link>

        <Link
          href="/super-admin/audit"
          className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:bg-slate-800/60 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Global Audit Trail</p>
              <p className="text-xs text-slate-400">Cross-workspace action log stream</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-slate-300 transition-all" />
        </Link>
      </div>
    </div>
  )
}
