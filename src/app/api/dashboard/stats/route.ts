import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveWorkspaceContext } from '@/lib/workspace-context'

export async function GET(request: Request) {
  const ctx = await resolveWorkspaceContext(request)

  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
  }

  try {
    // ── 1. Bed Occupancy Metrics ────────────────────────────────────────────
    const beds = await prisma.bed.findMany({
      where: { workspace_id: ctx.workspaceId, deleted_at: null },
      select: { status: true },
    })

    const totalBeds = beds.length
    const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length
    const vacantBeds = beds.filter((b) => b.status === 'VACANT').length
    const maintenanceBeds = beds.filter((b) => b.status === 'MAINTENANCE').length
    const reservedBeds = beds.filter((b) => b.status === 'RESERVED').length
    const occupancyPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

    // ── 2. Financial Metrics ────────────────────────────────────────────────
    const paidPayments = await prisma.payment.findMany({
      where: {
        workspace_id: ctx.workspaceId,
        status: 'PAID',
      },
      select: { amount: true, payment_date: true, source: true },
    })

    const totalCollectedRent = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0)

    // Today's Revenue
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayCollected = paidPayments
      .filter((p) => new Date(p.payment_date) >= today)
      .reduce((sum, p) => sum + Number(p.amount), 0)

    // ── 3. Open Invoices + AR Aging Buckets ────────────────────────────────
    const openInvoices = await prisma.invoice.findMany({
      where: {
        workspace_id: ctx.workspaceId,
        status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
        deleted_at: null,
      },
      select: { total_amount: true, amount_paid: true, due_date: true, status: true },
    })

    const now = new Date()
    let aging030 = 0
    let aging3160 = 0
    let aging60plus = 0
    let totalPendingRent = 0

    for (const inv of openInvoices) {
      const balance = Number(inv.total_amount) - Number(inv.amount_paid)
      totalPendingRent += balance

      const diffDays = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= 0) {
        aging030 += balance
      } else if (diffDays <= 30) {
        aging030 += balance
      } else if (diffDays <= 60) {
        aging3160 += balance
      } else {
        aging60plus += balance
      }
    }

    // Collection Efficiency: paid invoices vs total issued this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const allMonthInvoices = await prisma.invoice.findMany({
      where: {
        workspace_id: ctx.workspaceId,
        issue_date: { gte: monthStart },
        deleted_at: null,
        status: { not: 'CANCELLED' },
      },
      select: { total_amount: true, status: true },
    })

    const monthTotalBilled = allMonthInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0)
    const monthPaidInvoices = allMonthInvoices.filter((inv) => inv.status === 'PAID')
    const monthCollected = monthPaidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0)
    const collectionEfficiency =
      monthTotalBilled > 0 ? Math.round((monthCollected / monthTotalBilled) * 100) : 0

    // ── 4. Revenue Trend (Last 6 Months) ───────────────────────────────────
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const trendPayments = await prisma.payment.findMany({
      where: {
        workspace_id: ctx.workspaceId,
        status: 'PAID',
        payment_date: { gte: sixMonthsAgo },
      },
      select: { amount: true, payment_date: true },
    })

    // Group by year-month
    const trendMap: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      trendMap[key] = 0
    }
    for (const p of trendPayments) {
      const d = new Date(p.payment_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key in trendMap) {
        trendMap[key] += Number(p.amount)
      }
    }
    const revenueTrend = Object.entries(trendMap).map(([month, amount]) => ({ month, amount }))

    // Month-over-month delta
    const lastMonth = revenueTrend[revenueTrend.length - 2]?.amount ?? 0
    const currentMonth = revenueTrend[revenueTrend.length - 1]?.amount ?? 0
    const momDelta =
      lastMonth > 0 ? Math.round(((currentMonth - lastMonth) / lastMonth) * 100) : 0

    // ── 5. Complaint Summary ────────────────────────────────────────────────
    const [openComplaints, inProgressComplaints, resolvedThisMonth] = await Promise.all([
      prisma.complaint.count({
        where: { workspace_id: ctx.workspaceId, status: 'OPEN', deleted_at: null },
      }),
      prisma.complaint.count({
        where: { workspace_id: ctx.workspaceId, status: 'IN_PROGRESS', deleted_at: null },
      }),
      prisma.complaint.count({
        where: {
          workspace_id: ctx.workspaceId,
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolved_at: { gte: monthStart },
          deleted_at: null,
        },
      }),
    ])

    // ── 6. Today's Mess Kitchen Headcount ──────────────────────────────────
    let vegCount = 0
    let nonVegCount = 0
    let skippedCount = 0

    try {
      const todayMenus = await (prisma as any).mealMenu?.findMany?.({
        where: { workspace_id: ctx.workspaceId, date: today },
        include: { selections: true },
      }) || []

      todayMenus.forEach((menu: any) => {
        menu.selections?.forEach((sel: any) => {
          if (sel.choice === 'VEG') vegCount++
          else if (sel.choice === 'NON_VEG') nonVegCount++
          else if (sel.choice === 'SKIP') skippedCount++
        })
      })
    } catch (e) {
      console.warn('mealMenu headcount failed in stats:', e)
    }

    // ── 7. Pending Payment Proofs ───────────────────────────────────────────
    const pendingProofCount = await prisma.paymentProof.count({
      where: {
        workspace_id: ctx.workspaceId,
        payment: { status: 'PENDING_VERIFICATION' },
      },
    })

    return NextResponse.json({
      occupancy: {
        totalBeds,
        occupiedBeds,
        vacantBeds,
        maintenanceBeds,
        reservedBeds,
        occupancyPercentage,
      },
      financials: {
        todayRevenue: todayCollected,
        collectedRent: totalCollectedRent,
        pendingRent: totalPendingRent,
        pendingProofCount,
        collectionEfficiency,
        monthTotalBilled,
        monthCollected,
        momDelta,
        arAging: {
          current: Math.round(aging030),
          days1to30: Math.round(aging030),
          days31to60: Math.round(aging3160),
          days60plus: Math.round(aging60plus),
        },
      },
      revenueTrend,
      complaints: {
        open: openComplaints,
        inProgress: inProgressComplaints,
        resolvedThisMonth,
      },
      messHeadcount: {
        vegCount,
        nonVegCount,
        skippedCount,
        totalSelected: vegCount + nonVegCount + skippedCount,
      },
    })
  } catch (error: any) {
    console.error('GET Dashboard Stats Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
