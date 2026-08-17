'use client'

import { useEffect, useState } from 'react'
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  UserCheck,
  Filter,
  Plus,
  Flame,
  Star,
  FileText,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from 'lucide-react'

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)

  // Status update form state
  const [updateForm, setUpdateForm] = useState({
    status: 'IN_PROGRESS',
    assignedStaffId: '',
    resolutionNotes: '',
  })

  const fetchComplaints = async () => {
    setLoading(true)
    try {
      let url = '/api/complaints'
      if (filterStatus !== 'ALL') {
        url += `?status=${filterStatus}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setComplaints(data.complaints || [])
    } catch (err) {
      console.error('Failed to fetch complaints:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaints()
  }, [filterStatus])

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedComplaint) return

    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update ticket')

      setShowStatusModal(false)
      fetchComplaints()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const openUpdateModal = (c: any) => {
    setSelectedComplaint(c)
    setUpdateForm({
      status: c.status,
      assignedStaffId: c.assigned_staff_id || '',
      resolutionNotes: c.resolution_notes || '',
    })
    setShowStatusModal(true)
  }

  // Calculate Metrics
  const openCount = complaints.filter((c) => c.status === 'OPEN').length
  const inProgressCount = complaints.filter((c) => c.status === 'IN_PROGRESS').length
  const breachedCount = complaints.filter((c) => c.isBreached).length
  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl flex items-center gap-3">
            <Wrench className="h-8 w-8 text-amber-400" /> Incident & Maintenance Complaint Desk
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            SLA tracking, priority dispatch, staff assignments, and resolution auditing.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-amber-500/20 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Open Tickets</span>
            <Wrench className="h-5 w-5 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{openCount}</p>
          <span className="text-xs text-amber-400">Awaiting staff pickup</span>
        </div>

        <div className="rounded-xl border border-indigo-500/20 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">In Progress</span>
            <Clock className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{inProgressCount}</p>
          <span className="text-xs text-indigo-400">Under active repair</span>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">SLA Breaches</span>
            <Flame className="h-5 w-5 text-rose-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-400">{breachedCount}</p>
          <span className="text-xs text-rose-400">Past SLA target deadline</span>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Resolved</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{resolvedCount}</p>
          <span className="text-xs text-emerald-400">Fixed & verified</span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-3">
        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              filterStatus === st
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading maintenance complaints...</div>
      ) : complaints.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Maintenance Tickets Found</h3>
          <p className="text-xs text-slate-400 mt-1">All maintenance issues are resolved!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => {
            const tenantName = c.tenant?.user
              ? `${c.tenant.user.first_name} ${c.tenant.user.last_name}`
              : 'Resident'
            const roomName = c.tenant?.bed?.room?.room_number
              ? `Room ${c.tenant.bed.room.room_number}`
              : 'Resident Room'

            return (
              <div
                key={c.id}
                className={`relative flex flex-col justify-between rounded-xl border p-5 transition ${
                  c.isBreached
                    ? 'border-rose-500/60 bg-rose-950/10'
                    : c.priority === 'URGENT'
                    ? 'border-amber-500/40 bg-slate-900'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${
                        c.priority === 'URGENT'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : c.priority === 'HIGH'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {c.priority}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 uppercase">{c.category}</span>
                    <h3 className="text-base font-bold text-white">{c.title}</h3>
                  </div>

                  {/* SLA Badge */}
                  <div>
                    {c.isBreached ? (
                      <span className="inline-flex items-center space-x-1 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/40">
                        <Flame className="h-3.5 w-3.5" />
                        <span>SLA BREACHED</span>
                      </span>
                    ) : c.sla_due_at ? (
                      <span className="inline-flex items-center space-x-1 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 border border-slate-700">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        <span>SLA: {c.remainingHours}h remaining</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-300">{c.description}</p>
                    {c.resolution_notes && (
                      <div className="mt-2 rounded-lg bg-emerald-950/40 p-2.5 border border-emerald-800/40 text-xs text-emerald-300">
                        <strong>Fix Note:</strong> {c.resolution_notes}
                      </div>
                    )}
                    {c.attachment_url && (
                      <a
                        href={c.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center space-x-1 text-xs font-semibold text-amber-400 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>View Photo Proof Attachment</span>
                      </a>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-400 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                    <div>
                      Resident: <strong className="text-white">{tenantName}</strong> ({roomName})
                    </div>
                    <div>
                      Assigned Staff:{' '}
                      <strong className="text-amber-400">
                        {c.assigned_staff ? `${c.assigned_staff.first_name} ${c.assigned_staff.last_name}` : 'Unassigned'}
                      </strong>
                    </div>
                    <div>
                      Status:{' '}
                      <span className="font-bold text-white uppercase">{c.status}</span>
                    </div>
                    {c.rating && (
                      <div className="flex items-center space-x-1 text-amber-400 font-bold">
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                        <span>Resident Rating: {c.rating}/5</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end space-x-3 border-t border-slate-800/80 pt-3">
                  <button
                    onClick={() => openUpdateModal(c)}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    Manage Ticket & Assign Staff
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* UPDATE / ASSIGN MODAL */}
      {showStatusModal && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Manage Complaint #{selectedComplaint.id.slice(0, 8)}</h3>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300">Update Ticket Status</label>
                <select
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white"
                >
                  <option value="OPEN">OPEN (Awaiting Staff)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Staff Assigned & Fixing)</option>
                  <option value="RESOLVED">RESOLVED (Fix Complete)</option>
                  <option value="CLOSED">CLOSED (Ticket Finalized)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300">Resolution Fix Notes</label>
                <textarea
                  rows={3}
                  placeholder="Describe fix completed..."
                  value={updateForm.resolutionNotes}
                  onChange={(e) => setUpdateForm({ ...updateForm, resolutionNotes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
