'use client'

import { useEffect, useState } from 'react'
import { Utensils, Plus, Calendar, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function MealsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [menus, setMenus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form State for publishing menu
  const [formData, setFormData] = useState({
    slot: 'LUNCH',
    title: '',
    description: '',
    vegAvailable: true,
    nonVegAvailable: true,
    vegPrice: 60,
    nonVegPrice: 90,
    cutoffHoursBefore: 3, // Hours before meal time
  })

  const fetchMenus = () => {
    setLoading(true)
    fetch(`/api/meals/menu?date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        setMenus(data.menus || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchMenus()
  }, [selectedDate])

  const handlePublishMenu = async (e: React.FormEvent) => {
    e.preventDefault()

    // Calculate cutoff datetime
    const mealTime = new Date(`${selectedDate}T12:00:00`)
    const cutoffTime = new Date(mealTime.getTime() - formData.cutoffHoursBefore * 60 * 60 * 1000)

    try {
      const res = await fetch('/api/meals/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          slot: formData.slot,
          title: formData.title,
          description: formData.description,
          vegAvailable: formData.vegAvailable,
          nonVegAvailable: formData.nonVegAvailable,
          vegPrice: formData.vegPrice,
          nonVegPrice: formData.nonVegPrice,
          cutoffTime: cutoffTime.toISOString(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to publish menu')
      }

      setShowModal(false)
      fetchMenus()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Meal Calendar & Mess Headcount</h1>
          <p className="mt-1 text-sm text-slate-400">
            Slot-based Veg/Non-Veg pricing, daily selection cutoffs, and real-time kitchen plate counts.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none min-h-[44px]"
          />
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            <span>Publish Meal Slot</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 animate-pulse">Fetching meal calendar...</div>
      ) : menus.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <Utensils className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-bold text-white">No meal slots published for {selectedDate}</h3>
          <p className="mt-1 text-sm text-slate-400">Click "Publish Meal Slot" to define today's menu options.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {menus.map((menu) => {
            const vegPlates = menu.selections?.filter((s: any) => s.choice === 'VEG').length || 0
            const nonVegPlates = menu.selections?.filter((s: any) => s.choice === 'NON_VEG').length || 0
            const skipped = menu.selections?.filter((s: any) => s.choice === 'SKIP').length || 0

            return (
              <div key={menu.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-400 ring-1 ring-indigo-500/20">
                      {menu.slot}
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-white">{menu.title}</h3>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-400" /> Cutoff:
                    </span>
                    <p className="font-semibold text-slate-300">{new Date(menu.cutoff_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <p className="text-sm text-slate-300">{menu.description || 'Standard mess menu items.'}</p>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
                    <span className="text-slate-400">Veg Price</span>
                    <p className="text-base font-bold text-emerald-400">₹{Number(menu.veg_price)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
                    <span className="text-slate-400">Non-Veg Price</span>
                    <p className="text-base font-bold text-rose-400">
                      {menu.non_veg_available ? `₹${Number(menu.non_veg_price)}` : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Headcount Breakdown */}
                <div className="border-t border-slate-800 pt-4 space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Kitchen Headcount</span>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300 border border-emerald-500/20">
                      <span className="block font-bold text-base">{vegPlates}</span> Veg
                    </div>
                    <div className="rounded-lg bg-rose-500/10 p-2 text-rose-300 border border-rose-500/20">
                      <span className="block font-bold text-base">{nonVegPlates}</span> Non-Veg
                    </div>
                    <div className="rounded-lg bg-slate-800 p-2 text-slate-400 border border-slate-700">
                      <span className="block font-bold text-base">{skipped}</span> Skipped
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Publish Menu Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Publish Meal Slot Menu</h3>

            <form onSubmit={handlePublishMenu} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">Meal Slot</label>
                <select
                  value={formData.slot}
                  onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="BREAKFAST">Breakfast</option>
                  <option value="LUNCH">Lunch</option>
                  <option value="DINNER">Dinner</option>
                  <option value="SNACKS">Snacks</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Menu Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Paneer Butter Masala & Chicken Curry"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Veg Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.vegPrice}
                    onChange={(e) => setFormData({ ...formData, vegPrice: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">Non-Veg Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.nonVegPrice}
                    onChange={(e) => setFormData({ ...formData, nonVegPrice: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-lg"
                >
                  Publish Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
