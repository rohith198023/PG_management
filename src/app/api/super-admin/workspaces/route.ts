import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'
import bcrypt from 'bcryptjs'

// ── GET: List all workspaces with metrics ────────────────────────────────────
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if ('response' in auth) return auth.response

    if (auth.session.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super-Admin access required' }, { status: 403 })
    }

    const workspaces = await prisma.workspace.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        subscription: true,
        _count: {
          select: {
            users: { where: { deleted_at: null } },
            beds: { where: { deleted_at: null } },
            tenants: { where: { deleted_at: null } },
            properties: { where: { deleted_at: null } },
          },
        },
      },
    })

    // Compute MRR per workspace from paid payments in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const mrrData = await prisma.payment.groupBy({
      by: ['workspace_id'],
      where: {
        status: 'PAID',
        payment_date: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    })

    const mrrMap = new Map<string, number>(mrrData.map((d) => [d.workspace_id, Number(d._sum.amount ?? 0)] as [string, number]))

    const result = workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      email: ws.email,
      phone: ws.phone,
      is_active: ws.is_active,
      created_at: ws.created_at,
      subscription: ws.subscription,
      metrics: {
        totalUsers: ws._count.users,
        totalBeds: ws._count.beds,
        totalTenants: ws._count.tenants,
        totalProperties: ws._count.properties,
        mrrLast30Days: mrrMap.get(ws.id) ?? 0,
      },
    }))

    const globalMetrics = {
      totalWorkspaces: workspaces.length,
      activeWorkspaces: workspaces.filter((w) => w.is_active).length,
      suspendedWorkspaces: workspaces.filter((w) => !w.is_active).length,
      totalMRR: [...mrrMap.values()].reduce((s: number, v: number) => s + v, 0),
    }

    return NextResponse.json({ workspaces: result, globalMetrics })
  } catch (error: any) {
    console.error('Super-Admin GET workspaces error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch workspaces' }, { status: 500 })
  }
}

// ── POST: Provision new workspace ────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if ('response' in auth) return auth.response

    if (auth.session.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super-Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const {
      workspaceName,
      slug,
      email,
      phone,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
      planName = 'STARTER',
      maxBeds = 50,
      maxProperties = 1,
    } = body

    if (!workspaceName || !slug || !email || !phone || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existingSlug = await prisma.workspace.findUnique({ where: { slug } })
    if (existingSlug) {
      return NextResponse.json({ error: 'Workspace slug already taken' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12)

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create workspace
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug,
          email,
          phone,
        },
      })

      // 2. Create subscription record
      await tx.workspaceSubscription.create({
        data: {
          workspace_id: workspace.id,
          plan_name: planName as any,
          max_beds: maxBeds,
          max_properties: maxProperties,
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day trial
        },
      })

      // 3. Create workspace admin user
      const adminUser = await tx.user.create({
        data: {
          workspace_id: workspace.id,
          email: adminEmail,
          password_hash: passwordHash,
          role: 'WORKSPACE_ADMIN',
          first_name: adminFirstName || 'Admin',
          last_name: adminLastName || '',
          phone: phone,
        },
      })

      // 4. Seed default Chart of Accounts
      const defaultAccounts = [
        { code: '1010', name: 'Cash & Cash Equivalents', type: 'ASSET' },
        { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
        { code: '1500', name: 'Security Deposit Held (Asset)', type: 'ASSET' },
        { code: '2010', name: 'Security Deposit Liability', type: 'LIABILITY' },
        { code: '2100', name: 'Accrued Expenses', type: 'LIABILITY' },
        { code: '3010', name: 'Owner Equity', type: 'EQUITY' },
        { code: '4010', name: 'Rental Revenue', type: 'REVENUE' },
        { code: '4020', name: 'Meal Revenue', type: 'REVENUE' },
        { code: '4030', name: 'Late Fee Revenue', type: 'REVENUE' },
        { code: '5010', name: 'Maintenance Expense', type: 'EXPENSE' },
        { code: '5020', name: 'Utilities Expense', type: 'EXPENSE' },
        { code: '5030', name: 'Staff Salary Expense', type: 'EXPENSE' },
        { code: '5040', name: 'Gateway Fee Expense', type: 'EXPENSE' },
      ]

      await tx.ledgerAccount.createMany({
        data: defaultAccounts.map((a) => ({
          workspace_id: workspace.id,
          code: a.code,
          name: a.name,
          type: a.type as any,
        })),
      })

      return { workspace, adminUser }
    }, { timeout: 30000 })

    return NextResponse.json(
      {
        message: 'Workspace provisioned successfully',
        workspaceId: result.workspace.id,
        adminUserId: result.adminUser.id,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Super-Admin POST workspace error:', error)
    return NextResponse.json({ error: error.message || 'Failed to provision workspace' }, { status: 500 })
  }
}
