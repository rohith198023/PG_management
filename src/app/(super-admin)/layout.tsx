'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ShieldAlert,
  LayoutDashboard,
  Building2,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Globe,
  ChevronRight,
} from 'lucide-react'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setUserInfo(d) })
      .catch(() => {})
  }, [])

  const navItems = [
    { label: 'Global Overview', href: '/super-admin', icon: LayoutDashboard },
    { label: 'Workspaces', href: '/super-admin/workspaces', icon: Building2 },
    { label: 'Global Audit Trail', href: '/super-admin/audit', icon: ClipboardList },
  ]

  const handleLogout = () => {
    document.cookie = 'access_token=; Max-Age=0; path=/;'
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-rose-900/30 bg-slate-900/80 p-4 backdrop-blur-xl shrink-0">
        <div className="flex items-center space-x-3 px-2 py-4 border-b border-rose-900/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600/20 text-rose-400 ring-1 ring-rose-500/30">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Super Admin</h1>
            <p className="text-[10px] text-rose-400 flex items-center gap-1">
              <Globe className="h-3 w-3" /> Platform Control
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
                    ? 'bg-rose-600/20 text-rose-400 ring-1 ring-rose-500/30 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Back to dashboard link */}
        <div className="mt-4 border-t border-rose-900/30 pt-4 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 min-h-[44px]"
          >
            <span className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4" />
              Back to Dashboard
            </span>
            <ChevronRight className="h-4 w-4" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 min-h-[44px]"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile Topbar */}
        <header className="lg:hidden flex items-center justify-between border-b border-rose-900/30 bg-slate-900/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
            <span className="text-sm font-bold text-white">Super Admin</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="lg:hidden border-b border-rose-900/30 bg-slate-900 px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center space-x-3 rounded-lg px-3 py-3 text-sm font-medium min-h-[44px] ${
                    active ? 'bg-rose-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
