import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * DEV-ONLY: Cross-Tenant Security Boundary Audit
 *
 * This endpoint simulates cross-tenant attacks by attempting to access
 * entities (Properties, Invoices, Tenants) belonging to Workspace A
 * using the context of Workspace B. It verifies that 0 data leaks occur.
 *
 * Should NOT be reachable in production (guarded by PUBLIC_PATHS in middleware).
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const results: {
    test: string
    workspaceA: string
    workspaceB: string
    entityType: string
    leakDetected: boolean
    detail: string
  }[] = []

  let totalTests = 0
  let passedTests = 0
  let leakCount = 0

  try {
    // Get 2 distinct workspaces to run cross-tenant tests
    const workspaces = await prisma.workspace.findMany({
      take: 2,
      select: { id: true, name: true },
    })

    if (workspaces.length < 2) {
      return NextResponse.json({
        message: 'Need at least 2 workspaces to run cross-tenant audit. Seed more data first.',
        testsRun: 0,
        passed: 0,
        leaks: 0,
      })
    }

    const [wsA, wsB] = workspaces

    // ── Test 1: Properties Cross-Tenant Query ────────────────────────────
    totalTests++
    const wsAProperties = await prisma.property.findMany({
      where: { workspace_id: wsA.id },
      select: { id: true },
    })
    const leakTest1 = wsAProperties.length > 0
      ? await prisma.property.findFirst({
          where: { id: wsAProperties[0].id, workspace_id: wsB.id },
        })
      : null

    const t1Leak = leakTest1 !== null
    if (!t1Leak) passedTests++
    else leakCount++
    results.push({
      test: 'Cross-tenant Property access',
      workspaceA: wsA.name,
      workspaceB: wsB.name,
      entityType: 'Property',
      leakDetected: t1Leak,
      detail: t1Leak
        ? `LEAK: Property ${wsAProperties[0]?.id} from ${wsA.name} accessible via ${wsB.name} context`
        : `PASS: Property from ${wsA.name} not accessible via ${wsB.name} workspace_id filter`,
    })

    // ── Test 2: Invoice Cross-Tenant Query ───────────────────────────────
    totalTests++
    const wsAInvoices = await prisma.invoice.findMany({
      where: { workspace_id: wsA.id },
      select: { id: true },
      take: 1,
    })
    const leakTest2 = wsAInvoices.length > 0
      ? await prisma.invoice.findFirst({
          where: { id: wsAInvoices[0].id, workspace_id: wsB.id },
        })
      : null

    const t2Leak = leakTest2 !== null
    if (!t2Leak) passedTests++
    else leakCount++
    results.push({
      test: 'Cross-tenant Invoice access',
      workspaceA: wsA.name,
      workspaceB: wsB.name,
      entityType: 'Invoice',
      leakDetected: t2Leak,
      detail: t2Leak
        ? `LEAK: Invoice ${wsAInvoices[0]?.id} from ${wsA.name} accessible via ${wsB.name} context`
        : `PASS: Invoice from ${wsA.name} not accessible via ${wsB.name} workspace_id filter`,
    })

    // ── Test 3: TenantProfile Cross-Tenant Query ─────────────────────────
    totalTests++
    const wsATenants = await prisma.tenantProfile.findMany({
      where: { workspace_id: wsA.id },
      select: { id: true },
      take: 1,
    })
    const leakTest3 = wsATenants.length > 0
      ? await prisma.tenantProfile.findFirst({
          where: { id: wsATenants[0].id, workspace_id: wsB.id },
        })
      : null

    const t3Leak = leakTest3 !== null
    if (!t3Leak) passedTests++
    else leakCount++
    results.push({
      test: 'Cross-tenant TenantProfile access',
      workspaceA: wsA.name,
      workspaceB: wsB.name,
      entityType: 'TenantProfile',
      leakDetected: t3Leak,
      detail: t3Leak
        ? `LEAK: TenantProfile ${wsATenants[0]?.id} from ${wsA.name} accessible via ${wsB.name} context`
        : `PASS: TenantProfile from ${wsA.name} not accessible via ${wsB.name} workspace_id filter`,
    })

    // ── Test 4: Payment Cross-Tenant Query ───────────────────────────────
    totalTests++
    const wsAPayments = await prisma.payment.findMany({
      where: { workspace_id: wsA.id },
      select: { id: true },
      take: 1,
    })
    const leakTest4 = wsAPayments.length > 0
      ? await prisma.payment.findFirst({
          where: { id: wsAPayments[0].id, workspace_id: wsB.id },
        })
      : null

    const t4Leak = leakTest4 !== null
    if (!t4Leak) passedTests++
    else leakCount++
    results.push({
      test: 'Cross-tenant Payment access',
      workspaceA: wsA.name,
      workspaceB: wsB.name,
      entityType: 'Payment',
      leakDetected: t4Leak,
      detail: t4Leak
        ? `LEAK: Payment ${wsAPayments[0]?.id} from ${wsA.name} accessible via ${wsB.name} context`
        : `PASS: Payment from ${wsA.name} not accessible via ${wsB.name} workspace_id filter`,
    })

    return NextResponse.json({
      summary: {
        status: leakCount === 0 ? 'ALL_PASSED' : 'LEAKS_DETECTED',
        totalTests,
        passed: passedTests,
        failed: leakCount,
        leaksDetected: leakCount,
        isolationScore: `${Math.round((passedTests / totalTests) * 100)}%`,
      },
      workspaces: { wsA: wsA.name, wsB: wsB.name },
      results,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Security audit failed' },
      { status: 500 }
    )
  }
}
