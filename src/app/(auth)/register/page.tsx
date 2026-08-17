'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  User, 
  BedDouble, 
  ShieldCheck, 
  Sparkles,
  Layers,
  IndianRupee,
  Wifi,
  Tv,
  Wind,
  Coffee,
  Check,
  Zap,
  Users,
  Home,
  UtensilsCrossed,
  CreditCard,
  Lightbulb,
  Plus,
  Minus,
  Dumbbell,
  Car,
  Shirt,
  ArrowUpRight,
  TrendingUp,
  PartyPopper,
  Compass,
  LayoutGrid,
  HelpCircle,
  Briefcase,
  Sliders,
  Maximize2,
  Key,
  Shield,
  Activity,
  Award,
  CircleCheck,
  Building
} from 'lucide-react'

// --- PROPERTY CATEGORIES (HOSPITALITY-INSPIRED) ---
const PROPERTY_MODELS = [
  { id: 'PG', title: 'PG Accommodation', desc: 'Paying guest stays for working professionals & students', icon: Home, popular: true },
  { id: 'HOSTEL', title: 'Student Hostel', desc: 'Academic dormitories & multi-sharing room blocks', icon: Building2 },
  { id: 'COLIVING', title: 'Co-Living Community', desc: 'Premium shared spaces with curated lifestyle amenities', icon: Users, badge: 'High Yield' },
  { id: 'APARTMENT', title: 'Serviced Apartments', desc: 'Fully furnished private flats & multi-bedroom units', icon: Layers },
]

// --- RESIDENT WING WING ALLOCATION ---
const RESIDENT_FOCUS_TYPES = [
  { id: 'UNISEX', title: 'Unisex / Co-Ed Wings', emoji: '🌍', desc: 'Separate floors/wings by gender' },
  { id: 'BOYS', title: 'Male / Boys Only', emoji: '👨', desc: 'Optimized for male workers & students' },
  { id: 'GIRLS', title: 'Female / Girls Only', emoji: '👩', desc: 'Biometric gates & 24/7 security' },
  { id: 'FAMILY', title: 'Family / Couples', emoji: '👨‍👩‍👧', desc: 'Self-contained private units' },
]

// --- AMENITIES CHIPS ---
const HOSPITALITY_AMENITIES = [
  { id: 'wifi', label: 'High-Speed Wi-Fi', icon: Wifi },
  { id: 'ac', label: 'Air Conditioning (AC)', icon: Wind },
  { id: 'meals', label: 'Daily Mess / Food', icon: Coffee },
  { id: 'tv', label: 'Smart TV Lounge', icon: Tv },
  { id: 'gym', label: 'Fitness Gym', icon: Dumbbell },
  { id: 'parking', label: 'Vehicle Parking', icon: Car },
  { id: 'laundry', label: 'Laundry & Ironing', icon: Shirt },
]

// --- PAYMENT CHANNELS ---
const COLLECTION_CHANNELS = [
  { id: 'upi', name: 'Direct UPI & QR Code', desc: 'Instant GPay / PhonePe / Paytm payments (0% gateway fee)', recommended: true },
  { id: 'gateway', name: 'Automated Gateway', desc: 'Razorpay, Cashfree & Stripe automated checkout & webhooks' },
  { id: 'cash', name: 'Cash & Bank Transfer', desc: 'Manual receipt screenshot upload queue & manager approval' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [activeStage, setActiveStage] = useState(0) // 0: Landing Assistant
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [celebrate, setCelebrate] = useState(false)

  // Handcrafted Business State
  const [biz, setBiz] = useState({
    // Stage 1: Brand & Owner
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    brandName: '',

    // Stage 2: Property Architecture
    category: 'PG',
    residentWing: 'UNISEX',
    branchName: '',
    address: 'Central Sector 1, HSR Layout, Bengaluru',
    floorsCount: 4,

    // Stage 3: Inventory Builder (Room Styles)
    rooms: {
      single: { count: 4, rent: 12000 },
      double: { count: 12, rent: 8500 },
      triple: { count: 4, rent: 6500 },
      four: { count: 0, rent: 5000 },
    },

    // Stage 4: Operations & Mess
    amenities: ['wifi', 'ac', 'meals', 'laundry'],
    messActive: true,

    // Stage 5: Financial Rules
    depositMonths: 1,
    paymentChannel: 'upi',
  })

  // Load draft state on mount (Resumable Onboarding)
  useEffect(() => {
    const saved = localStorage.getItem('pg_sas_v5_draft')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setBiz((prev) => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error('Draft state parse failed')
      }
    }
  }, [])

  // Auto-save state
  useEffect(() => {
    localStorage.setItem('pg_sas_v5_draft', JSON.stringify(biz))
  }, [biz])

  // --- LIVE COMMAND CENTER CALCULATIONS ---
  const totalRooms = Object.values(biz.rooms).reduce((acc, curr) => acc + curr.count, 0)
  const totalBeds = 
    (biz.rooms.single.count * 1) +
    (biz.rooms.double.count * 2) +
    (biz.rooms.triple.count * 3) +
    (biz.rooms.four.count * 4)

  const estGrossMonthlyRevenue = 
    (biz.rooms.single.count * 1 * biz.rooms.single.rent) +
    (biz.rooms.double.count * 2 * biz.rooms.double.rent) +
    (biz.rooms.triple.count * 3 * biz.rooms.triple.rent) +
    (biz.rooms.four.count * 4 * biz.rooms.four.rent)

  const readinessScore = Math.min(100, Math.round((activeStage / 6) * 100))

  const handleText = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setBiz((prev) => ({ ...prev, [name]: value }))
  }

  const updateRoomCount = (type: keyof typeof biz.rooms, delta: number) => {
    setBiz((prev) => ({
      ...prev,
      rooms: {
        ...prev.rooms,
        [type]: {
          ...prev.rooms[type],
          count: Math.max(0, prev.rooms[type].count + delta),
        },
      },
    }))
  }

  const updateRoomRent = (type: keyof typeof biz.rooms, rentVal: number) => {
    setBiz((prev) => ({
      ...prev,
      rooms: {
        ...prev.rooms,
        [type]: {
          ...prev.rooms[type],
          rent: Math.max(0, rentVal),
        },
      },
    }))
  }

  const toggleAmenity = (id: string) => {
    setBiz((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(id)
        ? prev.amenities.filter((item) => item !== id)
        : [...prev.amenities, id],
    }))
  }

  const validateStage = (stageId: number) => {
    setError('')
    if (stageId === 1) {
      if (!biz.firstName || !biz.email || !biz.password || !biz.brandName) {
        setError('Please provide your name, work email, password, and business brand name.')
        return false
      }
      if (biz.password.length < 6) {
        setError('Password must be at least 6 characters.')
        return false
      }
    }
    if (stageId === 2) {
      if (!biz.branchName || !biz.address) {
        setError('Please enter your property branch name and full physical address.')
        return false
      }
    }
    if (stageId === 3) {
      if (totalBeds === 0) {
        setError('Please configure at least 1 room style to generate beds.')
        return false
      }
    }
    return true
  }

  const handleNextStage = () => {
    if (activeStage === 0 || validateStage(activeStage)) {
      setActiveStage((prev) => Math.min(prev + 1, 6))
    }
  }

  const handlePrevStage = () => {
    setError('')
    setActiveStage((prev) => Math.max(prev - 1, 0))
  }

  const handleLaunch = async () => {
    setError('')
    setLoading(true)

    try {
      // 1. Atomic Workspace, User, Ledger, & Physical Property Launch
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceName: biz.brandName,
          email: biz.email,
          password: biz.password,
          firstName: biz.firstName,
          lastName: biz.lastName || 'Owner',
          phone: biz.phone || '9876543210',
          branchName: biz.branchName || `${biz.brandName} Main Branch`,
          address: biz.address || 'Main Location',
          propertyType: biz.category || 'COED',
          floorsCount: Number(biz.floorsCount) || 4,
          roomsPerFloor: Math.max(1, Math.ceil(totalRooms / (biz.floorsCount || 1))),
          bedsPerRoom: 2,
          defaultRent: biz.rooms.double.rent || 8500,
          defaultDeposit: (biz.rooms.double.rent || 8500) * biz.depositMonths,
          amenities: biz.amenities || [],
        }),
      })

      const regData = await regRes.json()
      if (!regRes.ok) throw new Error(regData.error || 'Workspace creation failed')

      localStorage.removeItem('pg_sas_v5_draft')
      setCelebrate(true)

      setTimeout(() => {
        router.push('/dashboard')
      }, 3500)

    } catch (err: any) {
      setError(err.message || 'Activation failed')
    } finally {
      setLoading(false)
    }
  }

  // --- CONFETTI ANIMATION ---
  const renderConfetti = () => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(40)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            opacity: 1,
            y: -20,
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            rotate: 0,
          }}
          animate={{
            y: typeof window !== 'undefined' ? window.innerHeight + 100 : 800,
            rotate: 360 * (i % 2 === 0 ? 1 : -1),
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: Math.random() * 2.5 + 2,
            repeat: Infinity,
            delay: Math.random() * 1.5,
          }}
          className={`absolute h-3 w-3 rounded-sm ${
            ['bg-blue-500', 'bg-emerald-400', 'bg-purple-500', 'bg-amber-400', 'bg-pink-500'][i % 5]
          }`}
        />
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 selection:bg-blue-600 selection:text-white font-sans relative overflow-x-hidden">
      {celebrate && renderConfetti()}

      {/* Ambient Royal Blue Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 -z-10 h-[650px] w-[1200px] rounded-full bg-gradient-to-b from-blue-600/10 via-emerald-600/5 to-transparent blur-[150px] pointer-events-none" />

      {/* TOP ENTERPRISE HEADER */}
      <header className="border-b border-slate-800/80 bg-[#080C14]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-base">Pg_SAS</span>
              <span className="ml-2.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                Business Launch Studio v5.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
              Sign In to Workspace <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CANVAS */}
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">

        {/* ======================================================================== */}
        {/* STAGE 0: CONVERSATIONAL ASSISTANT LANDING */}
        {/* ======================================================================== */}
        {activeStage === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-3xl text-center space-y-8 py-8 md:py-14"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
              <span>Intelligent Setup Assistant & PG Operating System</span>
            </div>

            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl leading-tight">
              👋 Let's Launch Your <br />
              <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                PG & Hospitality Business Studio
              </span>
            </h1>

            <p className="mx-auto max-w-xl text-base text-slate-400 leading-relaxed">
              Design your owner brand, property wing architecture, room styles, kitchen mess logistics, and automated double-entry general ledger in one guided experience.
            </p>

            {/* Stage Cards Overview */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-left pt-2">
              {[
                { title: '1. Brand & Identity', desc: 'Owner profile & business brand', icon: Briefcase },
                { title: '2. Property Wings', desc: 'Category, focus & floor stack', icon: Building2 },
                { title: '3. Inventory Builder', desc: 'Room sharing cards & bed rates', icon: BedDouble },
                { title: '4. Operations & Mess', desc: 'Amenities & kitchen slots', icon: UtensilsCrossed },
                { title: '5. Financial Rules', desc: 'Deposit policy & UPI channels', icon: CreditCard },
                { title: '6. Business Launch', desc: 'Ledger activation & dashboard', icon: Sparkles },
              ].map((st, idx) => {
                const Icon = st.icon
                return (
                  <div key={idx} className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-4 backdrop-blur-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                        STAGE 0{idx + 1}
                      </span>
                      <Icon className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="font-bold text-xs text-white">{st.title}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">{st.desc}</div>
                  </div>
                )
              })}
            </div>

            {/* Time Estimation Note */}
            <div className="mx-auto flex max-w-sm items-center justify-between rounded-2xl border border-slate-800 bg-[#0F172A]/60 p-4 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Estimated Time: <strong>3–5 Minutes</strong></span>
              </div>
              <span className="text-slate-500">Fully Editable Later</span>
            </div>

            {/* START BUTTON */}
            <div>
              <button
                onClick={() => setActiveStage(1)}
                className="group relative inline-flex items-center gap-3 rounded-2xl bg-blue-600 px-9 py-4 text-base font-extrabold text-white shadow-xl shadow-blue-600/30 hover:bg-blue-500 hover:scale-105 transition-all duration-300"
              >
                <span>Launch Business Studio 1</span>
                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ======================================================================== */}
        {/* STAGES 1 TO 6: INTERACTIVE BUILDERS + DYNAMIC COMMAND CENTER */}
        {/* ======================================================================== */}
        {activeStage > 0 && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">

            {/* LEFT COLUMN: INTERACTIVE BUSINESS BUILDER (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">

              {/* STAGE PROGRESS TRACKER */}
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-5 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stage {activeStage} of 6</span>
                    <span className="text-xs font-bold text-white bg-blue-500/20 px-3 py-0.5 rounded-full border border-blue-500/30">
                      {['Brand & Identity', 'Property Wings', 'Inventory Builder', 'Operations & Mess', 'Financial Rules', 'Business Launch'][activeStage - 1]}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400">{readinessScore}% Readiness</span>
                </div>

                {/* Progress Bar Line */}
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(activeStage / 6) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              {/* ERROR ALERT BANNER */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-300 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
                    <span>{error}</span>
                  </div>
                  <button onClick={() => setError('')} className="text-slate-400 hover:text-white">✕</button>
                </motion.div>
              )}

              {/* BUILDER CONTAINER CARD */}
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A]/90 p-6 md:p-8 backdrop-blur-2xl shadow-2xl shadow-slate-950/80 min-h-[440px]">
                <AnimatePresence mode="wait">

                  {/* STAGE 1: BRAND & OWNER IDENTITY */}
                  {activeStage === 1 && (
                    <motion.div
                      key="st1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div>
                        <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-2">
                          <Briefcase className="h-3.5 w-3.5" /> Stage 1: Brand & Identity
                        </div>
                        <h2 className="text-2xl font-bold text-white">Who is the owner administrator?</h2>
                        <p className="text-xs text-slate-400 mt-1">Configure your master administrator account and workspace brand</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Workspace / Business Brand Name *</label>
                          <input
                            type="text"
                            name="brandName"
                            value={biz.brandName}
                            onChange={handleText}
                            placeholder="e.g. Royal Living Stays & Hostels"
                            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300">Owner First Name *</label>
                            <input
                              type="text"
                              name="firstName"
                              value={biz.firstName}
                              onChange={handleText}
                              placeholder="e.g. Pranay"
                              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300">Owner Last Name</label>
                            <input
                              type="text"
                              name="lastName"
                              value={biz.lastName}
                              onChange={handleText}
                              placeholder="e.g. Sharma"
                              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300">Email Address *</label>
                            <input
                              type="email"
                              name="email"
                              value={biz.email}
                              onChange={handleText}
                              placeholder="owner@royalliving.com"
                              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300">Mobile Phone Number</label>
                            <input
                              type="tel"
                              name="phone"
                              value={biz.phone}
                              onChange={handleText}
                              placeholder="+91 9876543210"
                              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-300">Account Password *</label>
                            <input
                              type="password"
                              name="password"
                              value={biz.password}
                              onChange={handleText}
                              placeholder="•••••••• (At least 6 characters)"
                              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STAGE 2: PROPERTY & WING ARCHITECTURE */}
                  {activeStage === 2 && (
                    <motion.div
                      key="st2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div>
                        <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-2">
                          <Building2 className="h-3.5 w-3.5" /> Stage 2: Property & Wing Architecture
                        </div>
                        <h2 className="text-2xl font-bold text-white">Design property layout & wings</h2>
                        <p className="text-xs text-slate-400 mt-1">Select category model, resident wings, and floor building layout</p>
                      </div>

                      {/* Property Category Cards */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-2">Property Category</label>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {PROPERTY_MODELS.map((pm) => {
                            const Icon = pm.icon
                            const isSelected = biz.category === pm.id
                            return (
                              <div
                                key={pm.id}
                                onClick={() => setBiz((prev) => ({ ...prev, category: pm.id }))}
                                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-600/15 shadow-lg shadow-blue-600/20 ring-1 ring-blue-500/50'
                                    : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300'}`}>
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <span className="font-bold text-sm text-white">{pm.title}</span>
                                  </div>
                                  {pm.badge && (
                                    <span className="text-[10px] font-semibold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-md">
                                      {pm.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 mt-2">{pm.desc}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Resident Gender Focus Cards */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-2">Resident Focus / Wing Allocation</label>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {RESIDENT_FOCUS_TYPES.map((rf) => {
                            const isSelected = biz.residentWing === rf.id
                            return (
                              <button
                                key={rf.id}
                                type="button"
                                onClick={() => setBiz((prev) => ({ ...prev, residentWing: rf.id }))}
                                className={`rounded-xl border p-3 text-center transition-all ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-600/20 text-white font-bold ring-1 ring-blue-500/50'
                                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                                }`}
                              >
                                <div className="text-2xl mb-1">{rf.emoji}</div>
                                <div className="text-xs font-semibold">{rf.title}</div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300">Property Branch Name *</label>
                          <input
                            type="text"
                            name="branchName"
                            value={biz.branchName}
                            onChange={handleText}
                            placeholder="e.g. Royal Living — HSR Layout Branch"
                            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300">Physical Address *</label>
                          <input
                            type="text"
                            name="address"
                            value={biz.address}
                            onChange={handleText}
                            placeholder="Plot 42, 27th Main Rd, Sector 1, HSR Layout, Bengaluru"
                            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* VISUAL FLOOR STACK RENDERER */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold text-slate-300">Building Floors Stack</label>
                            <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30">
                              🏢 {biz.floorsCount} Floors
                            </span>
                          </div>
                          <input
                            type="range"
                            name="floorsCount"
                            min="1"
                            max="15"
                            value={biz.floorsCount}
                            onChange={handleText}
                            className="w-full h-2 rounded-lg accent-blue-600 bg-slate-800 cursor-pointer mb-3"
                          />

                          {/* Visual Floor Stack Blocks */}
                          <div className="flex flex-col-reverse gap-1.5 p-3 rounded-2xl border border-slate-800 bg-slate-950/60 max-h-36 overflow-y-auto">
                            {[...Array(Number(biz.floorsCount))].map((_, i) => (
                              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-1.5 text-[11px] text-slate-300 border border-slate-700/40">
                                <span className="font-semibold text-white">Floor {i === 0 ? 'G (Ground)' : i}</span>
                                <span className="text-blue-400 text-[10px]">Active Floor Layer</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STAGE 3: ROOM & INVENTORY BUILDER */}
                  {activeStage === 3 && (
                    <motion.div
                      key="st3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div>
                        <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-2">
                          <BedDouble className="h-3.5 w-3.5" /> Stage 3: Inventory Builder
                        </div>
                        <h2 className="text-2xl font-bold text-white">Build room templates & pricing rules</h2>
                        <p className="text-xs text-slate-400 mt-1">Configure room counts per sharing category and base monthly rent per bed</p>
                      </div>

                      {/* Interactive Room Builders */}
                      <div className="space-y-3">
                        {/* Single Sharing */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <span className="font-bold text-sm text-white">🛋 Single Sharing Room</span>
                            <p className="text-[11px] text-slate-400">1 Bed per room (Private occupancy)</p>
                          </div>

                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateRoomCount('single', -1)}
                                className="h-8 w-8 rounded-lg bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-8 text-center font-bold text-blue-400 text-sm">
                                {biz.rooms.single.count}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateRoomCount('single', 1)}
                                className="h-8 w-8 rounded-lg bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">₹</span>
                              <input
                                type="number"
                                value={biz.rooms.single.rent}
                                onChange={(e) => updateRoomRent('single', Number(e.target.value))}
                                className="w-24 rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-xs text-emerald-400 font-bold"
                              />
                              <span className="text-[10px] text-slate-500">/bed</span>
                            </div>
                          </div>
                        </div>

                        {/* Double Sharing */}
                        <div className="rounded-2xl border border-blue-500/30 bg-blue-600/10 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">🛏🛏 Double Sharing Room</span>
                              <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-md">Popular</span>
                            </div>
                            <p className="text-[11px] text-slate-400">2 Beds per room (Shared occupancy)</p>
                          </div>

                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateRoomCount('double', -1)}
                                className="h-8 w-8 rounded-lg bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-8 text-center font-bold text-blue-400 text-sm">
                                {biz.rooms.double.count}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateRoomCount('double', 1)}
                                className="h-8 w-8 rounded-lg bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">₹</span>
                              <input
                                type="number"
                                value={biz.rooms.double.rent}
                                onChange={(e) => updateRoomRent('double', Number(e.target.value))}
                                className="w-24 rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-xs text-emerald-400 font-bold"
                              />
                              <span className="text-[10px] text-slate-500">/bed</span>
                            </div>
                          </div>
                        </div>

                        {/* Triple Sharing */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <span className="font-bold text-sm text-white">🛏🛏🛏 Triple Sharing Room</span>
                            <p className="text-[11px] text-slate-400">3 Beds per room</p>
                          </div>

                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateRoomCount('triple', -1)}
                                className="h-8 w-8 rounded-lg bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-8 text-center font-bold text-blue-400 text-sm">
                                {biz.rooms.triple.count}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateRoomCount('triple', 1)}
                                className="h-8 w-8 rounded-lg bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">₹</span>
                              <input
                                type="number"
                                value={biz.rooms.triple.rent}
                                onChange={(e) => updateRoomRent('triple', Number(e.target.value))}
                                className="w-24 rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-xs text-emerald-400 font-bold"
                              />
                              <span className="text-[10px] text-slate-500">/bed</span>
                            </div>
                          </div>
                        </div>

                        {/* Four Sharing / Dorm Builder */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <span className="font-bold text-sm text-white">🛏 Four Sharing / Dormitory</span>
                            <p className="text-[11px] text-slate-400">4 Beds per room</p>
                          </div>

                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateRoomCount('four', -1)}
                                className="h-8 w-8 rounded-lg bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-8 text-center font-bold text-blue-400 text-sm">
                                {biz.rooms.four.count}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateRoomCount('four', 1)}
                                className="h-8 w-8 rounded-lg bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">₹</span>
                              <input
                                type="number"
                                value={biz.rooms.four.rent}
                                onChange={(e) => updateRoomRent('four', Number(e.target.value))}
                                className="w-24 rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-xs text-emerald-400 font-bold"
                              />
                              <span className="text-[10px] text-slate-500">/bed</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STAGE 4: OPERATIONS & MESS SUITE */}
                  {activeStage === 4 && (
                    <motion.div
                      key="st4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div>
                        <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-2">
                          <UtensilsCrossed className="h-3.5 w-3.5" /> Stage 4: Operations & Mess Suite
                        </div>
                        <h2 className="text-2xl font-bold text-white">Configure operational amenities & mess</h2>
                        <p className="text-xs text-slate-400 mt-1">Configure amenities, kitchen mess slots & dietary preferences</p>
                      </div>

                      {/* Amenities Chips */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-2">Property Amenities (Tap to Enable)</label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {HOSPITALITY_AMENITIES.map((chip) => {
                            const Icon = chip.icon
                            const isSelected = biz.amenities.includes(chip.id)
                            return (
                              <button
                                key={chip.id}
                                type="button"
                                onClick={() => toggleAmenity(chip.id)}
                                className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold transition-all ${
                                  isSelected
                                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-lg shadow-blue-500/10'
                                    : 'bg-slate-800/40 text-slate-400 border border-slate-800 hover:bg-slate-800'
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{chip.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Mess Logistics Toggle */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
                          <div>
                            <span className="font-bold text-sm text-white">Daily Kitchen Mess / Food Service</span>
                            <p className="text-xs text-slate-400">Enables meal slot selections & kitchen headcount analytics</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBiz((prev) => ({ ...prev, messActive: !prev.messActive }))}
                            className={`h-6 w-11 rounded-full transition-colors relative ${biz.messActive ? 'bg-blue-600' : 'bg-slate-700'}`}
                          >
                            <span className={`h-5 w-5 rounded-full bg-white absolute top-0.5 transition-transform ${biz.messActive ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STAGE 5: FINANCIAL RULES */}
                  {activeStage === 5 && (
                    <motion.div
                      key="st5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div>
                        <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-2">
                          <CreditCard className="h-3.5 w-3.5" /> Stage 5: Financial Rules & Security
                        </div>
                        <h2 className="text-2xl font-bold text-white">Payment pathways & deposit rules</h2>
                        <p className="text-xs text-slate-400 mt-1">Configure tenant collection channels and security deposit rules</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-2">Refundable Security Deposit Policy</label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { months: 1, label: '1 Month Rent', desc: 'Standard PG norm' },
                              { months: 2, label: '2 Months Rent', desc: 'High security' },
                              { months: 0.5, label: 'Half Month Rent', desc: 'Low barrier' },
                            ].map((dp) => (
                              <button
                                key={dp.months}
                                type="button"
                                onClick={() => setBiz((prev) => ({ ...prev, depositMonths: dp.months }))}
                                className={`rounded-xl border p-3 text-left transition-all ${
                                  biz.depositMonths === dp.months
                                    ? 'border-blue-500 bg-blue-600/20 text-white font-bold ring-1 ring-blue-500/50'
                                    : 'border-slate-800 bg-slate-800/40 text-slate-400'
                                }`}
                              >
                                <div className="text-xs font-bold text-white">{dp.label}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{dp.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-2">Preferred Collection Channel</label>
                          <div className="space-y-2">
                            {COLLECTION_CHANNELS.map((pc) => {
                              const isSelected = biz.paymentChannel === pc.id
                              return (
                                <div
                                  key={pc.id}
                                  onClick={() => setBiz((prev) => ({ ...prev, paymentChannel: pc.id }))}
                                  className={`cursor-pointer rounded-2xl border p-4 flex items-center justify-between transition-all ${
                                    isSelected
                                      ? 'border-blue-500 bg-blue-600/15 shadow-lg shadow-blue-500/10'
                                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                                  }`}
                                >
                                  <div>
                                    <div className="font-bold text-sm text-white flex items-center gap-2">
                                      {pc.name}
                                      {pc.recommended && (
                                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md font-semibold">
                                          Recommended
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">{pc.desc}</div>
                                  </div>
                                  {isSelected && <Check className="h-5 w-5 text-blue-400" />}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STAGE 6: BUSINESS LAUNCHPAD */}
                  {activeStage === 6 && (
                    <motion.div
                      key="st6"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-6 py-4"
                    >
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500 text-slate-950 shadow-2xl shadow-emerald-500/40">
                        <PartyPopper className="h-10 w-10 animate-bounce" />
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                          🎉 Congratulations! Your Business is Ready
                        </h2>
                        <p className="text-sm text-slate-400 max-w-md mx-auto">
                          Physical inventory, double-entry general ledger, and workspace boundaries are fully provisioned.
                        </p>
                      </div>

                      {/* Summary Metrics */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-xl mx-auto text-left">
                        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
                          <span className="text-[10px] text-slate-400">Total Rooms</span>
                          <p className="text-xl font-black text-white">{totalRooms}</p>
                        </div>
                        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
                          <span className="text-[10px] text-blue-300">Total Beds</span>
                          <p className="text-xl font-black text-blue-400">{totalBeds}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                          <span className="text-[10px] text-emerald-300">Est. Monthly Revenue</span>
                          <p className="text-xl font-black text-emerald-400">₹{estGrossMonthlyRevenue.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
                          <span className="text-[10px] text-slate-400">Ledger Status</span>
                          <p className="text-xs font-bold text-emerald-400 mt-1">Ready ✅</p>
                        </div>
                      </div>

                      {/* LAUNCH BUTTON */}
                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={handleLaunch}
                          disabled={loading}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-10 py-4 text-base font-extrabold text-slate-950 shadow-2xl shadow-emerald-500/30 hover:bg-emerald-400 hover:scale-105 transition-all duration-300 disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                              Activating General Ledger & Workspace...
                            </>
                          ) : (
                            <>
                              <span>Activate Workspace & Go to Dashboard</span>
                              <ArrowUpRight className="h-5 w-5" />
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* NAVIGATION BUTTONS */}
              {activeStage < 6 && (
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-[#0F172A]/60 p-4 backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={handlePrevStage}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStage}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition-all"
                  >
                    Next Stage <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: DYNAMIC LIVE BUSINESS COMMAND CENTER (4 Cols) */}
            <div className="lg:col-span-4 space-y-6 sticky top-24">
              
              {/* LIVE COMMAND CENTER SUMMARY PANEL */}
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A]/95 p-6 backdrop-blur-2xl shadow-2xl shadow-slate-950/80 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-200">Live Business Command Center</span>
                  </div>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                </div>

                <div className="space-y-4">
                  {/* Revenue Estimate Box */}
                  <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4 text-center">
                    <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Est. Gross Monthly Revenue</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">
                      ₹{estGrossMonthlyRevenue.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Dynamic Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
                      <span className="text-slate-400 text-[10px]">Properties</span>
                      <div className="font-bold text-white text-sm mt-0.5">1 Branch</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
                      <span className="text-slate-400 text-[10px]">Floors</span>
                      <div className="font-bold text-white text-sm mt-0.5">{biz.floorsCount} Floors</div>
                    </div>
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                      <span className="text-blue-300 text-[10px]">Total Rooms</span>
                      <div className="font-bold text-blue-400 text-sm mt-0.5">{totalRooms} Rooms</div>
                    </div>
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3">
                      <span className="text-indigo-300 text-[10px]">Total Beds</span>
                      <div className="font-bold text-indigo-400 text-sm mt-0.5">{totalBeds} Beds</div>
                    </div>
                  </div>

                  {/* Operation Checks */}
                  <div className="space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Mess Logistics:</span>
                      <span className={`font-semibold ${biz.messActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {biz.messActive ? 'Enabled ✅' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Payment Channel:</span>
                      <span className="font-semibold text-blue-400 uppercase">{biz.paymentChannel}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Deposit Policy:</span>
                      <span className="font-semibold text-slate-200">{biz.depositMonths} Month Rent</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTEXTUAL CONSULTANT TIP */}
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 text-xs text-blue-200 backdrop-blur-xl flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5">Intelligent Consultant Tip</span>
                  <p className="text-blue-200/90 leading-relaxed">
                    {activeStage === 1 && 'Creating your workspace initializes your isolated tenant database boundary (`workspace_id`).'}
                    {activeStage === 2 && 'Structuring building floor layouts establishes the inventory hierarchy for multi-wing expansion.'}
                    {activeStage === 3 && 'Double sharing room templates maintain 94% occupancy across urban PGs and yield highest revenue/sqft.'}
                    {activeStage === 4 && 'Setting daily mess cutoff rules reduces kitchen food waste by up to 35% monthly.'}
                    {activeStage === 5 && 'Direct UPI collections have a 0% processing fee and yield the fastest cash flow.'}
                    {activeStage === 6 && 'All settings configured in this studio remain 100% editable inside Workspace Settings.'}
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  )
}
