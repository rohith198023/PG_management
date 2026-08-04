'use client'

import { useEffect, useState } from 'react'
import { Building2, BedDouble, Plus, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/properties')
      .then((res) => res.json())
      .then((data) => {
        setProperties(data.properties || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-slate-400 animate-pulse">Loading property hierarchy...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Property & Bed Inventory</h1>
          <p className="mt-1 text-sm text-slate-400">
            Per-bed occupancy tracking and room availability hierarchy.
          </p>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-bold text-white">No properties configured yet</h3>
          <p className="mt-1 text-sm text-slate-400">Run the setup wizard to generate floors, rooms, and bed records.</p>
        </div>
      ) : (
        properties.map((prop) => (
          <div key={prop.id} className="space-y-6">
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl">
              <div>
                <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/20">
                  {prop.property_type}
                </span>
                <h2 className="mt-2 text-xl font-bold text-white">{prop.name}</h2>
                <p className="text-xs text-slate-400">{prop.address}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Floors Count</span>
                <p className="text-xl font-extrabold text-white">{prop.floors?.length || 0}</p>
              </div>
            </div>

            {/* Floors Grid */}
            <div className="space-y-6">
              {prop.floors?.map((floor: any) => (
                <div key={floor.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                  <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">
                    {floor.name}
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {floor.rooms?.map((room: any) => (
                      <div
                        key={room.id}
                        className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-slate-700"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div>
                            <span className="text-xs font-bold text-slate-400">Room</span>
                            <h4 className="text-lg font-black text-white">{room.room_number}</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-400">₹{Number(room.rent_amount).toLocaleString('en-IN')}/mo</span>
                            <p className="text-[10px] text-slate-400">Cap: {room.capacity} beds</p>
                          </div>
                        </div>

                        {/* Beds Mapping */}
                        <div className="mt-3 space-y-2">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Beds State:</span>
                          <div className="grid grid-cols-2 gap-2">
                            {room.beds?.map((bed: any) => (
                              <div
                                key={bed.id}
                                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium border ${
                                  bed.status === 'OCCUPIED'
                                    ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                                    : bed.status === 'VACANT'
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                }`}
                              >
                                <span>Bed {bed.bed_number}</span>
                                <span className="text-[10px] font-bold uppercase">{bed.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
