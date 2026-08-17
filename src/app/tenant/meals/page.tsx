'use client'

import { useEffect, useState } from 'react'
import {
  Utensils,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Ban,
  Calendar,
  ChevronRight,
  Info,
} from 'lucide-react'

export default function TenantMealsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [menus, setMenus] = useState<any[]>([])
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submittingSlot, setSubmittingSlot] = useState<string | null>(null)

  const fetchMeals = async () => {
    setLoading(true)
    try {
      const [menuRes, selRes] = await Promise.all([
        fetch(`/api/meals/menu?date=${selectedDate}`),
        fetch(`/api/meals/selection?date=${selectedDate}`),
      ])

      const menuData = await menuRes.json()
      const selData = await selRes.json()

      setMenus(menuData.menus || [])
      setConfig(menuData.config || null)

      const selMap: Record<string, string> = {}
      if (Array.isArray(selData.selections)) {
        selData.selections.forEach((s: any) => {
          selMap[s.menu_id] = s.choice
        })
      }
      setSelections(selMap)
    } catch (err) {
      console.error('Failed to fetch resident meal options:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeals()
  }, [selectedDate])

  const handleSelectChoice = async (menuId: string, choice: 'VEG' | 'NON_VEG' | 'SKIP') => {
    setSubmittingSlot(menuId)
    try {
      const res = await fetch('/api/meals/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId, choice }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update selection')

      setSelections((prev) => ({ ...prev, [menuId]: choice }))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmittingSlot(null)
    }
  }

  // Generate 5-day quick date picker tabs
  const dateTabs = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' })
    return { dateStr, dayLabel, fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl flex items-center gap-3">
          🍽️ Today's Mess & Meal Selector
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Choose your daily meals before slot cutoffs. Food wastage prevention is enforced.
        </p>
      </div>

      {/* Date Ribbon */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {dateTabs.map((tab) => {
          const isSelected = selectedDate === tab.dateStr
          return (
            <button
              key={tab.dateStr}
              onClick={() => setSelectedDate(tab.dateStr)}
              className={`flex-1 min-w-[100px] rounded-xl p-3 text-center transition border ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-lg shadow-emerald-950/20'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="block text-xs font-bold uppercase">{tab.dayLabel}</span>
              <span className="block text-sm font-semibold mt-0.5">{tab.fullDate}</span>
            </button>
          )
        })}
      </div>

      {/* Billing Policy Banner */}
      {config && (
        <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4 text-amber-400" />
            <span>
              Workspace Meal Policy:{' '}
              <strong className="text-white">
                {config.billing_type === 'INCLUDED_IN_RENT'
                  ? 'Included in Rent (Free)'
                  : config.billing_type === 'CHARGED_PER_MEAL'
                  ? 'Charged Per Meal'
                  : 'Monthly Meal Plan'}
              </strong>
            </span>
          </div>
          <span className="text-slate-400">Timezone: {config.timezone}</span>
        </div>
      )}

      {/* Meal Slots List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading daily mess schedule...</div>
      ) : menus.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <Utensils className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Menu Published for {selectedDate}</h3>
          <p className="text-xs text-slate-400 mt-1">
            The kitchen team hasn't published menus for this day yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {menus.map((menu) => {
            const currentChoice = selections[menu.id] || 'UNSELECTED'
            const cutoffDate = new Date(menu.cutoff_time)
            const isCutoffPassed = new Date().getTime() >= cutoffDate.getTime()
            const isSubmitting = submittingSlot === menu.id

            return (
              <div
                key={menu.id}
                className={`relative overflow-hidden rounded-2xl border p-6 transition ${
                  menu.is_special
                    ? 'border-amber-500/50 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 shadow-xl shadow-amber-950/20'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                {/* Special Tag Header */}
                {menu.is_special && (
                  <div className="mb-4 inline-flex items-center space-x-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-500/30">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{menu.special_tag || 'SPECIAL DAY MENU'}</span>
                  </div>
                )}

                {/* Cancelled Banner */}
                {menu.is_canceled ? (
                  <div className="flex items-center space-x-3 rounded-xl bg-rose-950/60 p-4 border border-rose-800/60 text-rose-300">
                    <Ban className="h-5 w-5 text-rose-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-white">Meal Slot Cancelled</h4>
                      <p className="text-xs text-rose-300 mt-0.5">{menu.cancel_note || 'Kitchen unavailable today.'}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                          {menu.slot}
                        </span>
                        <h2 className="text-xl font-bold text-white mt-0.5">{menu.title}</h2>
                        {menu.description && (
                          <p className="text-xs text-slate-400 mt-1">{menu.description}</p>
                        )}
                      </div>

                      {/* Cutoff Status Badge */}
                      <div className="shrink-0">
                        {isCutoffPassed ? (
                          <span className="inline-flex items-center space-x-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 border border-slate-700">
                            <Clock className="h-3.5 w-3.5 text-rose-400" />
                            <span>Selection Locked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 rounded-lg bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-800/60">
                            <Clock className="h-3.5 w-3.5 text-emerald-400" />
                            <span>
                              Cutoff:{' '}
                              {cutoffDate.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Structured Items List */}
                    {menu.items && menu.items.length > 0 && (
                      <div className="my-4 flex flex-wrap gap-2">
                        {menu.items.map((item: any) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center space-x-1.5 rounded-lg bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 border border-slate-700/50"
                          >
                            <span className={item.is_veg ? 'text-emerald-400' : 'text-rose-400'}>
                              {item.is_veg ? '🥗' : '🍗'}
                            </span>
                            <span>{item.name}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Selection Controls */}
                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-xs text-slate-400">
                        Your choice:{' '}
                        <strong
                          className={`font-bold ${
                            currentChoice === 'VEG'
                              ? 'text-emerald-400'
                              : currentChoice === 'NON_VEG'
                              ? 'text-rose-400'
                              : currentChoice === 'SKIP'
                              ? 'text-slate-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {currentChoice}
                        </strong>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:w-auto">
                        <button
                          disabled={isCutoffPassed || isSubmitting || !menu.veg_available}
                          onClick={() => handleSelectChoice(menu.id, 'VEG')}
                          className={`flex items-center justify-center space-x-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                            currentChoice === 'VEG'
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40 ring-2 ring-emerald-400'
                              : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 disabled:opacity-40'
                          }`}
                        >
                          <span>🥗 Veg</span>
                        </button>

                        <button
                          disabled={isCutoffPassed || isSubmitting || !menu.non_veg_available}
                          onClick={() => handleSelectChoice(menu.id, 'NON_VEG')}
                          className={`flex items-center justify-center space-x-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                            currentChoice === 'NON_VEG'
                              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/40 ring-2 ring-rose-400'
                              : 'bg-slate-800 text-rose-400 hover:bg-slate-700 disabled:opacity-40'
                          }`}
                        >
                          <span>🍗 Non-Veg</span>
                        </button>

                        <button
                          disabled={isCutoffPassed || isSubmitting}
                          onClick={() => handleSelectChoice(menu.id, 'SKIP')}
                          className={`flex items-center justify-center space-x-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                            currentChoice === 'SKIP'
                              ? 'bg-slate-700 text-white ring-2 ring-slate-400'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-40'
                          }`}
                        >
                          <span>⏭️ Skip</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
