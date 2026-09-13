'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  Home,
  Receipt,
  CreditCard,
  UtensilsCrossed,
  Wrench,
  Bell,
  LogOut,
  User,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
} from 'lucide-react'

export default function TenantPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profile, setProfile] = useState<{ user: any; workspace: any; tenant: any } | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setProfile(data)
      })
      .catch((err) => console.error('Failed to fetch resident profile:', err))

    fetch('/api/tenant/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) setUnreadNotifications(data.notifications.length)
      })
      .catch((err) => console.error('Failed to fetch notifications count:', err))
  }, [])

  const navItems = [
    { label: 'Overview', href: '/tenant', icon: Home, exact: true },
    { label: 'Invoices & Dues', href: '/tenant/invoices', icon: Receipt },
    { label: 'Payments & Receipts', href: '/tenant/payments', icon: CreditCard },
    { label: 'Daily Mess Meals', href: '/tenant/meals', icon: UtensilsCrossed },
    { label: 'Complaints Desk', href: '/tenant/complaints', icon: Wrench },
    {
      label: 'Notifications',
      href: '/tenant/notifications',
      icon: Bell,
      badge: unreadNotifications > 0 ? unreadNotifications : null,
    },
  ]

  const handleLogout = async () => {
    document.cookie = 'access_token=; Max-Age=0; path=/;'
    router.push('/login')
  }

  const isNavActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-black/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand / PG Info */}
            <div className="flex items-center space-x-3">
              <Link href="/tenant" className="flex items-center space-x-3 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 group-hover:scale-105 transition-transform shadow-md shadow-indigo-950/40">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-black text-white tracking-tight">
                      {profile?.workspace?.name || 'Pg_SAS'}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      RESIDENT
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span>Resident Portal</span>
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Quick Nav Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isNavActive(item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-inner'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Profile & Logout Action */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="h-7 w-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                  {profile?.user?.firstName?.[0] || 'R'}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white leading-tight">
                    {profile?.user?.firstName ? `${profile.user.firstName} ${profile.user.lastName || ''}` : 'Resident'}
                  </p>
                  <span className="text-[10px] text-emerald-400 font-semibold block">Active Lease</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign out of portal"
                className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-950/20 transition-all shadow-sm"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden items-center space-x-2">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-800/80 bg-slate-900/95 px-4 py-4 space-y-1.5 backdrop-blur-2xl">
            <div className="flex items-center space-x-3 px-3 py-2 mb-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                {profile?.user?.firstName?.[0] || 'R'}
              </div>
              <div className="text-left truncate">
                <p className="text-xs font-bold text-white">
                  {profile?.user?.firstName ? `${profile.user.firstName} ${profile.user.lastName || ''}` : 'Resident'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{profile?.user?.email}</p>
              </div>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon
              const active = isNavActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    active
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/40'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}

            <button
              onClick={handleLogout}
              className="flex w-full items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/30 transition pt-3 border-t border-slate-800"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Resident Portal Container with Consistent Max-Width and Padding */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Resident Portal Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{profile?.workspace?.name || 'Pg_SAS'} • Resident Self-Service Portal</span>
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <Sparkles className="h-3 w-3 text-indigo-400" /> Powered by Pg_SAS Enterprise Platform
          </span>
        </div>
      </footer>
    </div>
  )
}
