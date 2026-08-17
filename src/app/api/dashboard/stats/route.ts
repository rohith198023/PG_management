import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveWorkspaceContext } from '@/lib/workspace-context'

export async function GET(request: Request) {
  const ctx = await resolveWorkspaceContext(request)

  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
  }

  try {
    // 1. Bed Occupancy Metrics
    const beds = await prisma.bed.findMany({
      where: { workspace_id: ctx.workspaceId, deleted_at: null },
      select: { status: true },
    })

    const totalBeds = beds.length
    const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length
    const vacantBeds = beds.filter((b) => b.status === 'VACANT').length
    const occupancyPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

    // 2. Financial Metrics
    const paidPayments = await prisma.payment.findMany({
      where: {
        workspace_id: ctx.workspaceId,
        status: 'PAID',
      },
      select: { amount: true, payment_date: true, source: true },
    })

    const totalCollectedRent = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0)

    // Calculate Today's Revenue
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayCollected = paidPayments
      .filter((p) => new Date(p.payment_date) >= today)
      .reduce((sum, p) => sum + Number(p.amount), 0)

    // Pending Rent Calculation
    const openInvoices = await prisma.invoice.findMany({
      where: {
        workspace_id: ctx.workspaceId,
        status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
        deleted_at: null,
      },
      select: { total_amount: true, amount_paid: true },
    })

    const totalPendingRent = openInvoices.reduce(
      (sum, inv) => sum + (Number(inv.total_amount) - Number(inv.amount_paid)),
      0
    )

    // 3. Today's Mess Kitchen Headcount
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

    // 4. Pending Payment Proofs Count
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
        occupancyPercentage,
      },
      financials: {
        todayRevenue: todayCollected,
        collectedRent: totalCollectedRent,
        pendingRent: totalPendingRent,
        pendingProofCount,
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
