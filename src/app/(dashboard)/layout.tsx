'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  LayoutDashboard,
  BedDouble,
  UtensilsCrossed,
  Receipt,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Users,
  User,
  CreditCard,
  Sliders
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<{ user: any; workspace: any } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUserInfo(data)
      })
      .catch((err) => console.error(err))
  }, [])

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Property & Inventory', href: '/properties', icon: BedDouble },
    { label: 'Tenants & Admission', href: '/tenants', icon: Users },
    { label: 'Invoices & Rent Desk', href: '/invoices', icon: Receipt },
    { label: 'Meal Management', href: '/meals', icon: UtensilsCrossed },
    { label: 'Payment Verifications', href: '/payments', icon: CreditCard },
    { label: 'Accounting & P&L', href: '/accounting', icon: Sliders },
    { label: 'Gateway Settings', href: '/settings/gateways', icon: Sliders },
  ]

  const handleLogout = async () => {
    document.cookie = 'access_token=; Max-Age=0; path=/;'
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl shrink-0">
        <div className="flex items-center space-x-3 px-2 py-4 border-b border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white truncate max-w-[140px]">
              {userInfo?.workspace?.name || 'Pg_SAS'}
            </h1>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" /> Isolated Tenant
            </p>
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all min-h-[44px] ${
                  active
                    ? 'bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-800 pt-4">
          <div className="flex items-center space-x-3 px-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300">
              <User className="h-4 w-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-white">{userInfo?.user?.firstName} {userInfo?.user?.lastName}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{userInfo?.user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 min-h-[44px]"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile Topbar */}
        <header className="lg:hidden flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-white truncate max-w-[160px]">
              {userInfo?.workspace?.name || 'Pg_SAS'}
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Mobile Navigation Sheet */}
        {mobileOpen && (
          <div className="lg:hidden border-b border-slate-800 bg-slate-900 px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center space-x-3 rounded-lg px-3 py-3 text-sm font-medium min-h-[44px] ${
                    active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="flex w-full items-center space-x-3 rounded-lg px-3 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 min-h-[44px]"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
