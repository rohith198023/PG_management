'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building2,
  User,
  Calendar,
} from 'lucide-react'

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'text-emerald-400 bg-emerald-500/10',
  LOGOUT: 'text-slate-400 bg-slate-700/40',
  PROPERTY_CREATED: 'text-indigo-400 bg-indigo-500/10',
  TENANT_ADMITTED: 'text-purple-400 bg-purple-500/10',
  INVOICE_GENERATED: 'text-amber-400 bg-amber-500/10',
  PAYMENT_APPROVED: 'text-emerald-400 bg-emerald-500/10',
  PAYMENT_REJECTED: 'text-rose-400 bg-rose-500/10',
  WORKSPACE_SUSPENDED: 'text-rose-400 bg-rose-500/10',
  WORKSPACE_REACTIVATED: 'text-emerald-400 bg-emerald-500/10',
}

function getActionColor(action: string) {
  return ACTION_COLORS[action] ?? 'text-slate-300 bg-slate-700/30'
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SuperAdminAuditPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (debouncedSearch) params.set('action', debouncedSearch)
    fetch(`/api/super-admin/audit?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [page, debouncedSearch])

  useEffect(() => { load() }, [load])

  const logs: any[] = data?.logs ?? []
  const pagination = data?.pagination ?? { total: 0, page: 1, totalPages: 1 }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-rose-400" /> Global Audit Trail
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Cross-workspace immutable action log stream — {pagination.total.toLocaleString()} total events.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-all min-h-[44px]"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Filter by action keyword (e.g. PAYMENT, LOGIN, WORKSPACE)..."
          className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
        />
      </div>

      {/* Log Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 animate-pulse text-sm">
            Loading audit events...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
            <ClipboardList className="h-10 w-10" />
            <p className="text-sm">No audit events found{search ? ' matching your filter' : ''}.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors">
                {/* Action Badge */}
                <div className="shrink-0 mt-0.5">
                  <span className={`inline-block rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${getActionColor(log.action)}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    {log.workspace && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span className="text-slate-300 font-medium">{log.workspace.name}</span>
                        <span className="text-slate-600">·</span>
                        <span className="font-mono text-slate-500">{log.workspace.slug}</span>
                      </span>
                    )}
                    {log.user && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{log.user.first_name} {log.user.last_name}</span>
                        <span className="text-slate-600">·</span>
                        <span className="font-mono text-[10px] rounded bg-slate-800 px-1.5 py-0.5 text-slate-400">{log.user.role}</span>
                      </span>
                    )}
                    {log.entity && (
                      <span className="font-mono text-[10px] rounded bg-slate-800/80 px-1.5 py-0.5 text-slate-400">
                        {log.entity}{log.entity_id ? `:${log.entity_id.slice(0, 8)}…` : ''}
                      </span>
                    )}
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-xs text-slate-500 font-mono truncate">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                <div className="shrink-0 text-right">
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 whitespace-nowrap">
                    <Calendar className="h-3 w-3" />
                    {formatTime(log.created_at)}
                  </span>
                  {log.ip_address && (
                    <span className="block mt-1 text-[10px] font-mono text-slate-600">{log.ip_address}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer pagination */}
        {!loading && logs.length > 0 && (
          <div className="border-t border-slate-800 px-6 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, pagination.total)} of {pagination.total.toLocaleString()} events
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-all"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
