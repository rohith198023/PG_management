'use client'

import { useEffect, useState } from 'react'
import {
  Utensils,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  ChefHat,
  FileText,
  Printer,
  Sparkles,
  Settings,
  XCircle,
  Copy,
  Layers,
  ArrowRight,
  Download,
} from 'lucide-react'

export default function MealsPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'template' | 'publish' | 'config'>('analytics')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [headcountData, setHeadcountData] = useState<any>(null)
  const [templateData, setTemplateData] = useState<any>(null)
  const [configData, setConfigData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showRosterModal, setShowRosterModal] = useState(false)
  const [selectedSlotRoster, setSelectedSlotRoster] = useState<{ slot: string; data: any } | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelTargetSlot, setCancelTargetSlot] = useState<any>(null)
  const [cancelReason, setCancelReason] = useState('KITCHEN_UNAVAILABLE')
  const [cancelNote, setCancelNote] = useState('')

  // Daily Menu Publish Form State
  const [publishForm, setPublishForm] = useState({
    slot: 'LUNCH',
    title: '',
    description: '',
    isSpecial: false,
    specialTag: '🍛 Biryani Special',
    vegAvailable: true,
    nonVegAvailable: true,
    vegPrice: 60,
    nonVegPrice: 90,
    cutoffHoursBefore: 3,
    items: [
      { category: 'MAIN_ITEM', name: '', isVeg: true },
      { category: 'SIDE_DISH', name: '', isVeg: true },
      { category: 'BEVERAGE', name: '', isVeg: true },
    ],
  })

  // Template Form State
  const [templateForm, setTemplateForm] = useState({
    dayOfWeek: 'MONDAY',
    slot: 'LUNCH',
    title: '',
    description: '',
    vegAvailable: true,
    nonVegAvailable: true,
    vegPrice: 60,
    nonVegPrice: 90,
    isSpecial: false,
    specialTag: '',
    items: [
      { category: 'MAIN_ITEM', name: '', isVeg: true },
      { category: 'SIDE_DISH', name: '', isVeg: true },
    ],
  })

  // Config Form State
  const [configForm, setConfigForm] = useState({
    billingType: 'INCLUDED_IN_RENT',
    monthlyPlanPrice: 3500,
    defaultVegPrice: 60,
    defaultNonVegPrice: 90,
    timezone: 'Asia/Kolkata',
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [hcRes, tmplRes, cfgRes] = await Promise.all([
        fetch(`/api/meals/headcount?date=${selectedDate}`),
        fetch(`/api/meals/template`),
        fetch(`/api/meals/config`),
      ])

      const hc = await hcRes.json()
      const tmpl = await tmplRes.json()
      const cfg = await cfgRes.json()

      setHeadcountData(hc)
      setTemplateData(tmpl.template)
      setConfigData(cfg.config)
      if (cfg.config) {
        setConfigForm({
          billingType: cfg.config.billing_type || 'INCLUDED_IN_RENT',
          monthlyPlanPrice: Number(cfg.config.monthly_plan_price) || 3500,
          defaultVegPrice: Number(cfg.config.default_veg_price) || 60,
          defaultNonVegPrice: Number(cfg.config.default_non_veg_price) || 90,
          timezone: cfg.config.timezone || 'Asia/Kolkata',
        })
      }
    } catch (err) {
      console.error('Failed to fetch meals data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const handlePublishMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const mealTime = new Date(`${selectedDate}T12:00:00`)
      const cutoffTime = new Date(mealTime.getTime() - publishForm.cutoffHoursBefore * 60 * 60 * 1000)

      const validItems = publishForm.items.filter((i) => i.name.trim() !== '')

      const res = await fetch('/api/meals/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          slot: publishForm.slot,
          title: publishForm.title,
          description: publishForm.description,
          isSpecial: publishForm.isSpecial,
          specialTag: publishForm.specialTag,
          vegAvailable: publishForm.vegAvailable,
          nonVegAvailable: publishForm.nonVegAvailable,
          vegPrice: publishForm.vegPrice,
          nonVegPrice: publishForm.nonVegPrice,
          cutoffTime: cutoffTime.toISOString(),
          items: validItems,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to publish menu')

      setShowPublishModal(false)
      fetchData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleTemplateSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const validItems = templateForm.items.filter((i) => i.name.trim() !== '')

      const res = await fetch('/api/meals/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayOfWeek: templateForm.dayOfWeek,
          slot: templateForm.slot,
          title: templateForm.title,
          description: templateForm.description,
          vegAvailable: templateForm.vegAvailable,
          nonVegAvailable: templateForm.nonVegAvailable,
          vegPrice: templateForm.vegPrice,
          nonVegPrice: templateForm.nonVegPrice,
          isSpecial: templateForm.isSpecial,
          specialTag: templateForm.specialTag,
          items: validItems,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update template')

      alert('Weekly template slot saved!')
      fetchData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleApplyTemplate = async () => {
    if (!confirm(`Apply master template to auto-populate daily menus starting from ${selectedDate} for 7 days?`)) return
    try {
      const res = await fetch('/api/meals/template/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: selectedDate, daysCount: 7 }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to apply template')

      alert(data.message)
      fetchData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/meals/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update config')

      alert('Meal billing policy updated successfully!')
      fetchData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCancelSlotSubmit = async () => {
    if (!cancelTargetSlot) return
    try {
      const res = await fetch(
        `/api/meals/menu?id=${cancelTargetSlot.menu.id}&reason=${cancelReason}&note=${encodeURIComponent(cancelNote)}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel slot')

      setShowCancelModal(false)
      fetchData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl flex items-center gap-3">
            <ChefHat className="h-8 w-8 text-amber-400" /> Mess & Kitchen Control Center
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Slot logistics, weekly templates, headcount analytics & printable prep sheets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none min-h-[44px]"
          />
          <button
            onClick={() => setShowPublishModal(true)}
            className="inline-flex items-center space-x-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            <span>Publish Menu</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 min-h-[44px]"
          >
            <Printer className="h-4 w-4 text-slate-400" />
            <span>Print Prep Sheet</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'analytics', label: 'Kitchen Headcount & Roster', icon: Users },
            { id: 'template', label: 'Weekly Master Template', icon: Layers },
            { id: 'config', label: 'Billing & Cutoff Policy', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 border-b-2 py-4 text-sm font-medium transition ${
                  active
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* TAB 1: HEADCOUNT ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium text-slate-300">
                Total Active Workspace Tenants:{' '}
                <strong className="text-white text-base">{headcountData?.totalTenants || 0}</strong>
              </span>
            </div>
            <button
              onClick={handleApplyTemplate}
              className="inline-flex items-center space-x-2 rounded-lg bg-indigo-600/80 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Auto-Populate 7 Days from Master Template</span>
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'].map((slot) => {
              const slotInfo = headcountData?.summary?.[slot]
              const isPub = slotInfo?.isPublished
              const hc = slotInfo?.headcount

              return (
                <div
                  key={slot}
                  className={`relative flex flex-col justify-between rounded-xl border p-5 transition ${
                    slotInfo?.menu?.isSpecial
                      ? 'border-amber-500/50 bg-slate-900/90 shadow-lg shadow-amber-950/20'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">{slot}</span>
                      {slotInfo?.menu?.isSpecial && (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30">
                          <Sparkles className="h-3 w-3" />
                          <span>{slotInfo.menu.specialTag || 'Special'}</span>
                        </span>
                      )}
                      {slotInfo?.menu?.isCanceled && (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30">
                          <XCircle className="h-3 w-3" />
                          <span>Cancelled</span>
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-lg font-bold text-white">
                      {isPub ? slotInfo.menu.title : 'No Menu Published'}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                      {isPub ? slotInfo.menu.description || 'Standard items' : 'Click Publish Menu to add menu details.'}
                    </p>

                    {/* Headcount Breakdown */}
                    {isPub && hc && (
                      <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Total Plates Needed</span>
                          <span className="font-bold text-white">{hc.totalExpected}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center text-xs">
                          <div className="rounded bg-emerald-950/60 p-1.5 border border-emerald-800/40">
                            <span className="block font-bold text-emerald-400">{hc.veg}</span>
                            <span className="text-[10px] text-emerald-300">Veg</span>
                          </div>
                          <div className="rounded bg-rose-950/60 p-1.5 border border-rose-800/40">
                            <span className="block font-bold text-rose-400">{hc.nonVeg}</span>
                            <span className="text-[10px] text-rose-300">Non-Veg</span>
                          </div>
                          <div className="rounded bg-slate-800/80 p-1.5 border border-slate-700/50">
                            <span className="block font-bold text-slate-400">{hc.skip}</span>
                            <span className="text-[10px] text-slate-400">Skip</span>
                          </div>
                          <div className="rounded bg-amber-950/60 p-1.5 border border-amber-800/40">
                            <span className="block font-bold text-amber-400">{hc.unselected}</span>
                            <span className="text-[10px] text-amber-300">Pending</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-3">
                    {isPub && (
                      <button
                        onClick={() => {
                          setSelectedSlotRoster({ slot, data: slotInfo })
                          setShowRosterModal(true)
                        }}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                      >
                        View Resident Roster $\rightarrow$
                      </button>
                    )}
                    {isPub && !slotInfo.menu.isCanceled && (
                      <button
                        onClick={() => {
                          setCancelTargetSlot(slotInfo)
                          setShowCancelModal(true)
                        }}
                        className="text-xs font-medium text-rose-400 hover:text-rose-300"
                      >
                        Cancel Slot
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY MASTER TEMPLATE */}
      {activeTab === 'template' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-bold text-white">Configure 7-Day Master Menu Schedule</h2>
            <p className="text-xs text-slate-400 mt-1">
              Define standard recurring weekly items for each day (Monday – Sunday). Clicking "Auto-Populate" will copy this schedule to upcoming dates.
            </p>

            <form onSubmit={handleTemplateSaveSubmit} className="mt-6 space-y-4 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Day of Week</label>
                  <select
                    value={templateForm.dayOfWeek}
                    onChange={(e) => setTemplateForm({ ...templateForm, dayOfWeek: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Meal Slot</label>
                  <select
                    value={templateForm.slot}
                    onChange={(e) => setTemplateForm({ ...templateForm, slot: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="BREAKFAST">BREAKFAST</option>
                    <option value="LUNCH">LUNCH</option>
                    <option value="DINNER">DINNER</option>
                    <option value="SNACKS">SNACKS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Slot Title</label>
                <input
                  type="text"
                  placeholder="e.g. Idli Sambar & Chutney / Chicken Biryani"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Description</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes for residents..."
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Veg Price (₹)</label>
                  <input
                    type="number"
                    value={templateForm.vegPrice}
                    onChange={(e) => setTemplateForm({ ...templateForm, vegPrice: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Non-Veg Price (₹)</label>
                  <input
                    type="number"
                    value={templateForm.nonVegPrice}
                    onChange={(e) => setTemplateForm({ ...templateForm, nonVegPrice: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Save Template Slot
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: BILLING POLICY CONFIG */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 max-w-2xl">
            <h2 className="text-lg font-bold text-white">Workspace Meal Billing & Cutoff Policy</h2>
            <p className="text-xs text-slate-400 mt-1">
              Control whether meals are included in rent or billed per plate to tenant accounts.
            </p>

            <form onSubmit={handleSaveConfig} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">Billing Policy Model</label>
                <select
                  value={configForm.billingType}
                  onChange={(e) => setConfigForm({ ...configForm, billingType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="INCLUDED_IN_RENT">Included in Monthly Rent (Free for Residents)</option>
                  <option value="CHARGED_PER_MEAL">Charged Per Meal (Billed to AR / Wallet)</option>
                  <option value="MONTHLY_MEAL_PLAN">Fixed Monthly Subscription Plan</option>
                  <option value="OPTIONAL_ADDON">Optional Ala-Carte Add-On</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Workspace Timezone</label>
                <input
                  type="text"
                  value={configForm.timezone}
                  onChange={(e) => setConfigForm({ ...configForm, timezone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Save Billing Policy
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PUBLISH MENU MODAL */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Publish Daily Slot Menu</h3>

            <form onSubmit={handlePublishMenuSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300">Slot</label>
                  <select
                    value={publishForm.slot}
                    onChange={(e) => setPublishForm({ ...publishForm, slot: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  >
                    <option value="BREAKFAST">BREAKFAST</option>
                    <option value="LUNCH">LUNCH</option>
                    <option value="DINNER">DINNER</option>
                    <option value="SNACKS">SNACKS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300">Menu Title</label>
                <input
                  type="text"
                  placeholder="e.g. Masala Dosa, Sambar & Filter Coffee"
                  value={publishForm.title}
                  onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex items-center space-x-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <input
                  type="checkbox"
                  id="isSpecial"
                  checked={publishForm.isSpecial}
                  onChange={(e) => setPublishForm({ ...publishForm, isSpecial: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="isSpecial" className="text-xs font-semibold text-amber-400">
                  Highlight as Special Day Menu (e.g. Biryani Day 🍛)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Publish Menu Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROSTER MODAL */}
      {showRosterModal && selectedSlotRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Kitchen Roster: {selectedSlotRoster.slot} ({selectedDate})
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedSlotRoster.data.menu?.title} — Plate Headcount Roster
                </p>
              </div>
              <button
                onClick={() => setShowRosterModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase">
                  <tr>
                    <th className="p-2.5">Room & Bed</th>
                    <th className="p-2.5">Resident Name</th>
                    <th className="p-2.5">Selection Choice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedSlotRoster.data.roster?.map((r: any) => (
                    <tr key={r.tenantId} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-semibold text-white">
                        {r.room} ({r.bed})
                      </td>
                      <td className="p-2.5 text-slate-200">{r.name}</td>
                      <td className="p-2.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                            r.choice === 'VEG'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : r.choice === 'NON_VEG'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : r.choice === 'SKIP'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-amber-950 text-amber-400'
                          }`}
                        >
                          {r.choice}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
