import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pg_SAS — Multi-Tenant PG & Hostel Operating System',
  description: 'Enterprise cloud-native property management SaaS for PGs, Hostels, and Co-living spaces.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  )
}
