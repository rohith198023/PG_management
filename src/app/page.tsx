import Link from 'next/link'
import { Building2, ShieldCheck, Utensils, IndianRupee, ArrowRight, BedDouble, Lock } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">Pg_SAS</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white">
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/25"
            >
              Setup Workspace →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Multi-Tenant Row-Level Security Enforced
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Enterprise Operating System for <span className="text-indigo-400">PGs, Hostels & Co-Living</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Manage multi-branch property inventory down to per-bed occupancy, double-entry general ledger dues, dynamic slot-based mess headcounts, and verified manual payment proofs.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/register"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-bold text-white hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30"
          >
            <span>Launch Your Property Wizard</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl border border-slate-800 bg-slate-900 px-8 py-4 text-base font-bold text-slate-300 hover:bg-slate-800"
          >
            <span>Tenant / Admin Login</span>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <BedDouble className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Per-Bed Inventory Hierarchy</h3>
            <p className="text-xs text-slate-400">
              Building &rarr; Floor &rarr; Room &rarr; Bed occupancy tracking. Real-time vacant bed alerts and automated state changes.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <IndianRupee className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Double-Entry Financial Ledger</h3>
            <p className="text-xs text-slate-400">
              BYO-Gateway credentials and manual proof upload verification queue backed by an immutable general ledger.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Utensils className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Dynamic Mess Headcount</h3>
            <p className="text-xs text-slate-400">
              Per-meal opt-in selection (Veg / Non-Veg / Skip) with slot pricing, selection cutoffs, and live kitchen plate counts.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © 2026 Pg_SAS Enterprise Property Operating System. Zero-Trust Multi-Tenant Architecture.
      </footer>
    </div>
  )
}
