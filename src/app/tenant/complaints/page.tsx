'use client'

import { useEffect, useState } from 'react'
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Star,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from 'lucide-react'

export default function TenantComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [targetComplaint, setTargetComplaint] = useState<any>(null)

  // Form State for creating complaint
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'PLUMBING',
    priority: 'MEDIUM',
    attachmentUrl: '',
  })

  // Form state for rating & closure
  const [ratingForm, setRatingForm] = useState({
    rating: 5,
    feedback: '',
  })

  const fetchComplaints = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/complaints')
      const data = await res.json()
      setComplaints(data.complaints || [])
    } catch (err) {
      console.error('Failed to fetch resident complaints:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaints()
  }, [])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create complaint')

      setShowCreateModal(false)
      setCreateForm({
        title: '',
        description: '',
        category: 'PLUMBING',
        priority: 'MEDIUM',
        attachmentUrl: '',
      })
      fetchComplaints()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetComplaint) return

    try {
      const res = await fetch(`/api/complaints/${targetComplaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CLOSED',
          rating: ratingForm.rating,
          feedback: ratingForm.feedback,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to close ticket')

      setShowRatingModal(false)
      fetchComplaints()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl flex items-center gap-3">
            🛠️ Maintenance & Repair Desk
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Submit repair requests, track staff assignment, and rate completed fixes.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          <span>New Repair Request</span>
        </button>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading your maintenance tickets...</div>
      ) : complaints.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <Wrench className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Maintenance Complaints Submitted</h3>
          <p className="text-xs text-slate-400 mt-1">
            Everything in your room working fine? Click "New Repair Request" if anything needs staff fix!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {complaints.map((c) => {
            const isResolved = c.status === 'RESOLVED'
            const isClosed = c.status === 'CLOSED'

            return (
              <div
                key={c.id}
                className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {c.category}
                    </span>
                    <h3 className="text-lg font-bold text-white">{c.title}</h3>
                  </div>

                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                      c.status === 'CLOSED'
                        ? 'bg-slate-800 text-slate-400'
                        : c.status === 'RESOLVED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : c.status === 'IN_PROGRESS'
                        ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                {/* Description & Fix Note */}
                <p className="text-xs text-slate-300">{c.description}</p>

                {c.resolution_notes && (
                  <div className="rounded-xl bg-emerald-950/40 p-3 border border-emerald-800/40 text-xs text-emerald-300">
                    <strong>Staff Resolution Note:</strong> {c.resolution_notes}
                  </div>
                )}

                {/* Rating if closed */}
                {c.rating && (
                  <div className="flex items-center space-x-2 text-xs text-amber-400 font-bold">
                    <span>Your Review:</span>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: c.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Action if RESOLVED */}
                {isResolved && (
                  <div className="pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => {
                        setTargetComplaint(c)
                        setShowRatingModal(true)
                      }}
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      Rate Fix & Finalize Ticket
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Submit Repair Complaint</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  >
                    <option value="PLUMBING">Plumbing 🚿</option>
                    <option value="ELECTRICAL">Electrical ⚡</option>
                    <option value="CARPENTRY">Carpentry / Bed / Lock 🚪</option>
                    <option value="CLEANING">Cleaning / Washroom 🧹</option>
                    <option value="INTERNET">Internet / WiFi 📶</option>
                    <option value="APPLIANCE">AC / Geyser / Fan ❄️</option>
                    <option value="SECURITY">Security / Door Lock 🔒</option>
                    <option value="OTHER">Other Issue 🛠️</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300">Priority Level</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  >
                    <option value="URGENT">URGENT (4h Target SLA)</option>
                    <option value="HIGH">HIGH (24h Target SLA)</option>
                    <option value="MEDIUM">MEDIUM (48h Target SLA)</option>
                    <option value="LOW">LOW (72h Target SLA)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Washroom tap leaking or AC not cooling"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300">Issue Description</label>
                <textarea
                  rows={3}
                  placeholder="Details about what needs repair..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300">Photo Proof Attachment URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={createForm.attachmentUrl}
                  onChange={(e) => setCreateForm({ ...createForm, attachmentUrl: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-5 py-2 font-bold text-slate-950 hover:bg-amber-400"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RATING MODAL */}
      {showRatingModal && targetComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Rate Maintenance Fix & Close</h3>

            <form onSubmit={handleRatingSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300">Rating (1 to 5 Stars)</label>
                <select
                  value={ratingForm.rating}
                  onChange={(e) => setRatingForm({ ...ratingForm, rating: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ Excellent (5 Stars)</option>
                  <option value={4}>⭐⭐⭐⭐ Good (4 Stars)</option>
                  <option value={3}>⭐⭐⭐ Satisfactory (3 Stars)</option>
                  <option value={2}>⭐⭐ Fair (2 Stars)</option>
                  <option value={1}>⭐ Poor (1 Star)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300">Feedback (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Share feedback on staff service..."
                  value={ratingForm.feedback}
                  onChange={(e) => setRatingForm({ ...ratingForm, feedback: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRatingModal(false)}
                  className="px-4 py-2 font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-500"
                >
                  Confirm & Close Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
