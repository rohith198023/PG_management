'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, CheckCircle2, ChevronRight, UserCheck, BedDouble, ShieldCheck } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    workspaceName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    propertyName: '',
    address: '',
    propertyType: 'PG',
    floorsCount: 2,
    roomsPerFloor: 4,
    bedsPerRoom: 2,
    defaultRent: 8500,
    defaultDeposit: 15000,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes('Count') || name.includes('Per') || name.includes('default') ? Number(value) : value,
    }))
  }

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    setStep((prev) => prev + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Register Workspace and Admin User
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceName: formData.workspaceName,
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        }),
      })

      const regData = await regRes.json()
      if (!regRes.ok) throw new Error(regData.error || 'Registration failed')

      // 2. Create Initial Property Hierarchy
      const propRes = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': regData.workspace.id,
          'x-user-role': regData.user.role,
          'Authorization': `Bearer ${regData.accessToken}`,
        },
        body: JSON.stringify({
          name: formData.propertyName || `${formData.workspaceName} Main Branch`,
          address: formData.address || 'Central PG Sector 1',
          propertyType: formData.propertyType,
          floorsCount: formData.floorsCount,
          roomsPerFloor: formData.roomsPerFloor,
          bedsPerRoom: formData.bedsPerRoom,
          defaultRent: formData.defaultRent,
          defaultDeposit: formData.defaultDeposit,
        }),
      })

      const propData = await propRes.json()
      if (!propRes.ok) throw new Error(propData.error || 'Property setup failed')

      // Navigate to Dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-2xl space-y-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl shadow-2xl">
        {/* Header & Step Wizard Indicator */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
            <Building2 className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">Setup Your Workspace</h2>
          <p className="mt-1 text-sm text-slate-400">
            Resumable Multi-Tenant Property Guided Wizard
          </p>

          <div className="mt-6 flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600/20 text-xs ring-1 ring-indigo-500">1</span>
              <span className="text-xs">Identity</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-600" />
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600/20 text-xs ring-1 ring-indigo-500">2</span>
              <span className="text-xs">Property</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-600" />
            <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600/20 text-xs ring-1 ring-indigo-500">3</span>
              <span className="text-xs">Rooms & Rent</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* STEP 1: Business Identity */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-400" /> Step 1: Admin & Workspace Identity
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-300">Workspace / PG Name</label>
                <input
                  type="text"
                  name="workspaceName"
                  required
                  value={formData.workspaceName}
                  onChange={handleChange}
                  placeholder="Royal Living Stays"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Admin Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="owner@royalliving.com"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Rajesh"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Kumar"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 flex w-full justify-center rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg"
            >
              Continue to Property Details →
            </button>
          </form>
        )}

        {/* STEP 2: Property Details */}
        {step === 2 && (
          <form onSubmit={handleNextStep} className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-400" /> Step 2: Property & Floor Structure
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300">Property Branch Name</label>
                <input
                  type="text"
                  name="propertyName"
                  required
                  value={formData.propertyName}
                  onChange={handleChange}
                  placeholder="Royal Living — HSR Layout Branch"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300">Address</label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Plot 42, 27th Main Rd, HSR Layout, Bengaluru"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Property Type</label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="PG">PG (Paying Guest)</option>
                  <option value="HOSTEL">Hostel</option>
                  <option value="COLIVING">Co-Living Space</option>
                  <option value="APARTMENT">Apartment Rental</option>
                  <option value="RENTAL">Student Housing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Number of Floors</label>
                <input
                  type="number"
                  name="floorsCount"
                  min="1"
                  max="50"
                  required
                  value={formData.floorsCount}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700"
              >
                ← Back
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg"
              >
                Configure Rooms & Rent →
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Rooms & Rent Pricing */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-indigo-400" /> Step 3: Room Inventory & Rent Configuration
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-300">Rooms Per Floor</label>
                <input
                  type="number"
                  name="roomsPerFloor"
                  min="1"
                  required
                  value={formData.roomsPerFloor}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Beds Per Room (Sharing)</label>
                <input
                  type="number"
                  name="bedsPerRoom"
                  min="1"
                  required
                  value={formData.bedsPerRoom}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Default Monthly Rent (₹)</label>
                <input
                  type="number"
                  name="defaultRent"
                  min="0"
                  required
                  value={formData.defaultRent}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Security Deposit (₹)</label>
                <input
                  type="number"
                  name="defaultDeposit"
                  min="0"
                  required
                  value={formData.defaultDeposit}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-4 text-xs text-indigo-300">
              ⚡ <strong>Inventory Preview:</strong> This wizard will automatically generate 
              <span className="font-bold text-white"> {formData.floorsCount * formData.roomsPerFloor} rooms </span> 
              and <span className="font-bold text-white"> {formData.floorsCount * formData.roomsPerFloor * formData.bedsPerRoom} beds </span> 
              scoped directly to your workspace.
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50"
              >
                {loading ? 'Initializing Property...' : 'Launch Workspace Dashboard 🎉'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-slate-400">
          Already have an active workspace?{' '}
          <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
