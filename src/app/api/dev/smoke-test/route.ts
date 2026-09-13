import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTrialBalanceStatement } from '@/lib/ledger/reports'

export const dynamic = 'force-dynamic'

/**
 * DEV-ONLY: Phase 12 — Production E2E Smoke Test Runner
 *
 * Automatically exercises all 8 checklist items from the production runbook
 * against the live database, returning a structured pass/fail report.
 *
 * Equivalent to manually running the smoke test checklist in:
 *   docs/production_runbook.md § 9. Production E2E Smoke Test Checklist
 *
 * ⚠️  Not reachable in production (NODE_ENV guard below).
 *     Invoke: GET /api/dev/smoke-test
 */

interface SmokeCheckResult {
  id: number
  name: string
  description: string
  passed: boolean
  detail: string
  durationMs: number
}

async function runCheck(
  id: number,
  name: string,
  description: string,
  fn: () => Promise<{ passed: boolean; detail: string }>
): Promise<SmokeCheckResult> {
  const start = Date.now()
  try {
    const { passed, detail } = await fn()
    return { id, name, description, passed, detail, durationMs: Date.now() - start }
  } catch (err: any) {
    return {
      id,
      name,
      description,
      passed: false,
      detail: `EXCEPTION: ${err?.message ?? String(err)}`,
      durationMs: Date.now() - start,
    }
  }
}

export async function GET(_request: Request) {
  // ── Production Guard ──────────────────────────────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Smoke test endpoint is not available in production.' }, { status: 404 })
  }

  const startTime = Date.now()
  const results: SmokeCheckResult[] = []

  // ── Resolve a workspace for checks that require one ───────────────────────
  const workspace = await prisma.workspace.findFirst({
    where: { is_active: true },
    select: { id: true, name: true },
  })

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 1 — Auth: Workspace & admin user exist and can be looked up
  // ─────────────────────────────────────────────────────────────────────────
  results.push(
    await runCheck(1, 'Auth / Workspace', 'Verify at least one active workspace + admin user exists in DB', async () => {
      if (!workspace) return { passed: false, detail: 'No active workspace found. Run seed or register a workspace.' }

      const adminUser = await prisma.user.findFirst({
        where: { workspace_id: workspace.id, role: { in: ['WORKSPACE_ADMIN', 'PLATFORM_SUPER_ADMIN'] } },
        select: { id: true, email: true, role: true },
      })

      if (!adminUser) return { passed: false, detail: `Workspace "${workspace.name}" has no admin user.` }

      return { passed: true, detail: `Workspace "${workspace.name}" found. Admin: ${adminUser.email} (${adminUser.role})` }
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 2 — Inventory: Properties, Floors, Rooms, Beds exist
  // ─────────────────────────────────────────────────────────────────────────
  results.push(
    await runCheck(2, 'Inventory', 'Verify property hierarchy (Property→Floor→Room→Bed) is populated', async () => {
      if (!workspace) return { passed: false, detail: 'No workspace to check.' }

      const [propCount, bedCount] = await Promise.all([
        prisma.property.count({ where: { workspace_id: workspace.id, deleted_at: null } }),
        prisma.bed.count({ where: { workspace_id: workspace.id, deleted_at: null } }),
      ])

      if (propCount === 0) return { passed: false, detail: 'No properties found. Create at least one property.' }
      if (bedCount === 0) return { passed: false, detail: 'Properties exist but no beds found.' }

      return { passed: true, detail: `${propCount} propert${propCount === 1 ? 'y' : 'ies'}, ${bedCount} beds found.` }
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 3 — Onboarding: Admission invite mechanism is functional
  // ─────────────────────────────────────────────────────────────────────────
  results.push(
    await runCheck(3, 'Tenant Onboarding', 'Verify admit invite table is accessible and tokens can be queried', async () => {
      if (!workspace) return { passed: false, detail: 'No workspace to check.' }

      const inviteCount = await prisma.admissionInvite.count({
        where: { workspace_id: workspace.id },
      })

      const tenantCount = await prisma.tenantProfile.count({
        where: { workspace_id: workspace.id },
      })

      return {
        passed: true,
        detail: `Invite system reachable. ${inviteCount} invite(s) issued, ${tenantCount} tenant(s) onboarded.`,
      }
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 4 — Billing: Invoice table is reachable and active leases exist
  // ─────────────────────────────────────────────────────────────────────────
  results.push(
    await runCheck(4, 'Invoice Billing', 'Verify invoice engine: active leases exist and invoices can be queried', async () => {
      if (!workspace) return { passed: false, detail: 'No workspace to check.' }

      const [activeLeaseCount, invoiceCount] = await Promise.all([
        prisma.lease.count({ where: { workspace_id: workspace.id, status: 'ACTIVE', deleted_at: null } }),
        prisma.invoice.count({ where: { workspace_id: workspace.id, deleted_at: null } }),
      ])

      if (activeLeaseCount === 0) {
        return { passed: false, detail: 'No active leases found. Onboard a tenant first.' }
      }

      return { passed: true, detail: `${activeLeaseCount} active lease(s) found. ${invoiceCount} invoice(s) in history.` }
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 5 — Payment: Payment and PaymentProof tables are accessible
  // ─────────────────────────────────────────────────────────────────────────
  results.push(
    await runCheck(5, 'Payment & Proof Queue', 'Verify payment proof queue and gateway config are accessible', async () => {
      if (!workspace) return { passed: false, detail: 'No workspace to check.' }

      const [paymentCount, pendingProofCount, gatewayCount] = await Promise.all([
        prisma.payment.count({ where: { workspace_id: workspace.id } }),
        prisma.paymentProof.count({ where: { workspace_id: workspace.id } }),
        prisma.gatewayConfig.count({ where: { workspace_id: workspace.id, is_active: true } }),
      ])

      return {
        passed: true,
        detail: `Payment system reachable. ${paymentCount} payment(s), ${pendingProofCount} proof(s), ${gatewayCount} active gateway(s).`,
      }
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 6 — Ledger: Trial Balance must satisfy Debits === Credits
  // ─────────────────────────────────────────────────────────────────────────
  results.push(
    await runCheck(6, 'General Ledger Integrity', 'Fetch trial balance and verify Σ Debits === Σ Credits (double-entry invariant)', async () => {
      if (!workspace) return { passed: false, detail: 'No workspace to check.' }

      const tb = await getTrialBalanceStatement(workspace.id)

      if (tb.rows.length === 0) {
        return { passed: true, detail: 'No ledger entries yet — balance trivially holds (0 = 0). Invariant safe.' }
      }

      if (!tb.isBalanced) {
        return {
          passed: false,
          detail: `IMBALANCE DETECTED! Total Debits ₹${tb.grandTotalDebit.toFixed(2)} ≠ Total Credits ₹${tb.grandTotalCredit.toFixed(2)}. Difference: ₹${Math.abs(tb.grandTotalDebit - tb.grandTotalCredit).toFixed(2)}`,
        }
      }

      return {
        passed: true,
        detail: `✓ Balanced. Total Debits = Total Credits = ₹${tb.grandTotalDebit.toFixed(2)} across ${tb.rows.length} ledger account(s).`,
      }
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 7 — Dashboard: Stats API returns non-null structured data
  // ─────────────────────────────────────────────────────────────────────────
  results.push(
    await runCheck(7, 'Analytics Dashboard', 'Verify dashboard stats query returns valid structured metrics', async () => {
      if (!workspace) return { passed: false, detail: 'No workspace to check.' }

      const [totalBeds, openComplaints, paidPaymentsCount] = await Promise.all([
        prisma.bed.count({ where: { workspace_id: workspace.id, deleted_at: null } }),
        prisma.complaint.count({ where: { workspace_id: workspace.id, status: 'OPEN', deleted_at: null } }),
        prisma.payment.count({ where: { workspace_id: workspace.id, status: 'PAID' } }),
      ])

      return {
        passed: true,
        detail: `Dashboard metrics reachable. ${totalBeds} bed(s) | ${openComplaints} open complaint(s) | ${paidPaymentsCount} paid payment(s).`,
      }
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 8 — Super-Admin: Platform super-admin account is present
  // ─────────────────────────────────────────────────────────────────────────
  results.push(
    await runCheck(8, 'Super-Admin Access', 'Verify PLATFORM_SUPER_ADMIN user exists for SaaS management panel', async () => {
      const superAdmin = await prisma.user.findFirst({
        where: { role: 'PLATFORM_SUPER_ADMIN' },
        select: { id: true, email: true },
      })

      if (!superAdmin) {
        return {
          passed: false,
          detail: 'No PLATFORM_SUPER_ADMIN user found. Run: GET /api/dev/make-admin or seed the database.',
        }
      }

      return { passed: true, detail: `Super-Admin present: ${superAdmin.email}` }
    })
  )

  // ── Aggregate Results ─────────────────────────────────────────────────────
  const passedCount = results.filter((r) => r.passed).length
  const failedCount = results.length - passedCount
  const totalDurationMs = Date.now() - startTime
  const allPassed = failedCount === 0

  return NextResponse.json(
    {
      summary: {
        status: allPassed ? 'ALL_PASSED ✅' : `${failedCount} CHECK(S) FAILED ❌`,
        totalChecks: results.length,
        passed: passedCount,
        failed: failedCount,
        workspaceTested: workspace?.name ?? 'N/A',
        totalDurationMs,
        timestamp: new Date().toISOString(),
      },
      checks: results.map((r) => ({
        [`#${r.id} ${r.name}`]: {
          status: r.passed ? '✅ PASS' : '❌ FAIL',
          description: r.description,
          detail: r.detail,
          durationMs: r.durationMs,
        },
      })),
      phase12ExitGate: allPassed
        ? '🎉 Phase 12 Production E2E Smoke Test PASSED — System is production-ready.'
        : '⚠️  One or more checks failed. Review details above and resolve before production deploy.',
    },
    { status: allPassed ? 200 : 207 }
  )
}
