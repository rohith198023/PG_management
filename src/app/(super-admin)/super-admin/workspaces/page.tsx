'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  ShieldAlert,
  Users,
  BedDouble,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'text-slate-300 bg-slate-800',
  GROWTH: 'text-indigo-300 bg-indigo-900/40',
  ENTERPRISE: 'text-amber-300 bg-amber-900/30',
  CUSTOM: 'text-purple-300 bg-purple-900/30',
}

export default function SuperAdminWorkspacesPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showProvision, setShowProvision] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [form, setForm] = useState({
    workspaceName: '',
    slug: '',
    email: '',
    phone: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    planName: 'STARTER',
    maxBeds: 50,
    maxProperties: 1,
  })
  const [provisioning, setProvisioning] = useState(false)
  const [provisionError, setProvisionError] = useState('')
  const [provisionSuccess, setProvisionSuccess] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/super-admin/workspaces')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleSuspend = async (id: string, isActive: boolean) => {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/super-admin/workspaces/${id}/suspend`, { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          workspaces: prev.workspaces.map((ws: any) =>
            ws.id === id ? { ...ws, is_active: json.is_active } : ws
          ),
        }))
      }
    } finally {
      setTogglingId(null)
    }
  }

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault()
    setProvisioning(true)
    setProvisionError('')
    setProvisionSuccess('')
    try {
      const res = await fetch('/api/super-admin/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        setProvisionError(json.error || 'Failed to provision workspace')
      } else {
        setProvisionSuccess(`Workspace provisioned! ID: ${json.workspaceId}`)
        setShowProvision(false)
        setForm({ workspaceName: '', slug: '', email: '', phone: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '', planName: 'STARTER', maxBeds: 50, maxProperties: 1 })
        load()
      }
    } catch {
      setProvisionError('Network error')
    } finally {
      setProvisioning(false)
    }
  }

  const workspaces: any[] = data?.workspaces ?? []
  const gm = data?.globalMetrics ?? {}

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-rose-400" /> Workspace Management
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Provision, manage subscriptions, and suspend tenants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-all min-h-[44px]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowProvision(!showProvision)}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/25 min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            Provision Workspace
          </button>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total', value: gm.totalWorkspaces ?? 0, color: 'text-white', icon: <Building2 className="h-4 w-4 text-rose-400" /> },
          { label: 'Active', value: gm.activeWorkspaces ?? 0, color: 'text-emerald-400', icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> },
          { label: 'Suspended', value: gm.suspendedWorkspaces ?? 0, color: 'text-rose-400', icon: <XCircle className="h-4 w-4 text-rose-400" /> },
          { label: 'Platform MRR', value: `₹${(gm.totalMRR ?? 0).toLocaleString('en-IN')}`, color: 'text-amber-300', icon: <IndianRupee className="h-4 w-4 text-amber-400" /> },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</span>
              {card.icon}
            </div>
            <p className={`text-2xl font-extrabold font-mono ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Provision Form */}
      {showProvision && (
        <div className="rounded-2xl border border-rose-900/40 bg-slate-900/60 p-6 backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-400" /> Provision New Workspace
          </h2>
          {provisionError && (
            <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{provisionError}</div>
          )}
          {provisionSuccess && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{provisionSuccess}</div>
          )}
          <form onSubmit={handleProvision} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { key: 'workspaceName', label: 'Workspace Name', placeholder: 'Green Hostel Pvt Ltd' },
              { key: 'slug', label: 'Slug (URL-safe)', placeholder: 'green-hostel' },
              { key: 'email', label: 'Workspace Email', placeholder: 'admin@greenhostel.com' },
              { key: 'phone', label: 'Phone', placeholder: '+919876543210' },
              { key: 'adminFirstName', label: 'Admin First Name', placeholder: 'Ravi' },
              { key: 'adminLastName', label: 'Admin Last Name', placeholder: 'Kumar' },
              { key: 'adminEmail', label: 'Admin Email', placeholder: 'ravi@greenhostel.com' },
              { key: 'adminPassword', label: 'Admin Password', placeholder: '••••••••', type: 'password' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
                <input
                  type={type || 'text'}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            ))}

            {/* Plan & Limits */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Subscription Plan</label>
              <select
                value={form.planName}
                onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                {['STARTER', 'GROWTH', 'ENTERPRISE', 'CUSTOM'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Max Beds</label>
              <input
                type="number"
                value={form.maxBeds}
                onChange={(e) => setForm((f) => ({ ...f, maxBeds: parseInt(e.target.value) }))}
                min={1}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowProvision(false)}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-all min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={provisioning}
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-all min-h-[44px]"
              >
                {provisioning && <Loader2 className="h-4 w-4 animate-spin" />}
                {provisioning ? 'Provisioning...' : 'Provision Workspace'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workspaces Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-base font-bold text-white">
            All Workspaces ({workspaces.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 animate-pulse">Loading workspaces...</div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
            <Building2 className="h-10 w-10" />
            <p className="text-sm">No workspaces yet. Provision one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {workspaces.map((ws: any) => (
              <div key={ws.id}>
                <div className="flex items-center gap-4 px-6 py-4">
                  {/* Status dot */}
                  <span className={`h-2 w-2 rounded-full shrink-0 ${ws.is_active ? 'bg-emerald-400' : 'bg-rose-500'}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{ws.name}</p>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${PLAN_COLORS[ws.subscription?.plan_name ?? 'STARTER'] ?? PLAN_COLORS.STARTER}`}>
                        {ws.subscription?.plan_name ?? 'No Plan'}
                      </span>
                      {ws.subscription?.is_trial && (
                        <span className="rounded-md bg-amber-900/30 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">Trial</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{ws.slug} · {ws.email}</p>
                  </div>

                  {/* Metrics */}
                  <div className="hidden sm:flex items-center gap-6 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {ws.metrics.totalBeds}/{ws.subscription?.max_beds ?? '∞'} beds</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {ws.metrics.totalTenants} tenants</span>
                    <span className="flex items-center gap-1 font-mono text-slate-300"><IndianRupee className="h-3.5 w-3.5" /> {(ws.metrics.mrrLast30Days ?? 0).toLocaleString('en-IN')} MRR</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExpandedId(expandedId === ws.id ? null : ws.id)}
                      className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-all"
                    >
                      {expandedId === ws.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      disabled={togglingId === ws.id}
                      onClick={() => toggleSuspend(ws.id, ws.is_active)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all min-h-[32px] ${
                        ws.is_active
                          ? 'border border-rose-700/50 text-rose-400 hover:bg-rose-500/10'
                          : 'border border-emerald-700/50 text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                    >
                      {togglingId === ws.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : ws.is_active ? 'Suspend' : 'Reactivate'}
                    </button>
                  </div>
                </div>

                {/* Expanded Row Detail */}
                {expandedId === ws.id && (
                  <div className="bg-slate-950/50 px-6 py-4 border-t border-slate-800">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
                      <div>
                        <p className="text-slate-400">Total Properties</p>
                        <p className="text-white font-semibold mt-0.5">{ws.metrics.totalProperties}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Total Users</p>
                        <p className="text-white font-semibold mt-0.5">{ws.metrics.totalUsers}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Max Beds (Plan)</p>
                        <p className="text-white font-semibold mt-0.5">{ws.subscription?.max_beds ?? '∞'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Workspace ID</p>
                        <p className="text-slate-300 font-mono mt-0.5 text-[10px] truncate">{ws.id}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
