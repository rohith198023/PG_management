import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateSlaDueDate, recordComplaintActivity } from '@/lib/complaints/complaint_engine'
import { ComplaintCategory, ComplaintPriority, ComplaintStatus } from '@prisma/client'
import { z } from 'zod'
import { resolveWorkspaceContext } from '@/lib/workspace-context'

const createComplaintSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.nativeEnum(ComplaintCategory).default('OTHER'),
  priority: z.nativeEnum(ComplaintPriority).default('MEDIUM'),
  attachmentUrl: z.string().optional(),
})


export async function GET(request: Request) {
  try {
    const authCtx = await resolveWorkspaceContext(request)
    if (!authCtx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const priorityParam = searchParams.get('priority')
    const categoryParam = searchParams.get('category')
    const staffParam = searchParams.get('assignedStaffId')

    const whereClause: any = {
      workspace_id: authCtx.workspaceId,
      deleted_at: null,
    }

    if (statusParam) whereClause.status = statusParam as ComplaintStatus
    if (priorityParam) whereClause.priority = priorityParam as ComplaintPriority
    if (categoryParam) whereClause.category = categoryParam as ComplaintCategory
    if (staffParam) whereClause.assigned_staff_id = staffParam

    // If resident tenant, restrict to tenant's complaints
    if (authCtx.role === 'TENANT') {
      const tenant = await prisma.tenantProfile.findFirst({
        where: { user_id: authCtx.userId, workspace_id: authCtx.workspaceId },
      })
      if (!tenant) return NextResponse.json({ complaints: [] })
      whereClause.tenant_id = tenant.id
    }

    const complaints = await prisma.complaint.findMany({
      where: whereClause,
      include: {
        tenant: {
          include: {
            user: true,
            bed: { include: { room: true } },
          },
        },
        assigned_staff: true,
      },
      orderBy: { created_at: 'desc' },
    })

    const now = new Date()

    const enriched = complaints.map((c) => {
      const isBreached = c.sla_due_at ? now > new Date(c.sla_due_at) && c.status !== 'RESOLVED' && c.status !== 'CLOSED' : false
      const remainingMs = c.sla_due_at ? new Date(c.sla_due_at).getTime() - now.getTime() : 0
      const remainingHours = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60)))

      return {
        ...c,
        isBreached,
        remainingHours,
      }
    })

    return NextResponse.json({ complaints: enriched })
  } catch (error: any) {
    console.error('GET Complaints Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch complaints' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authCtx = await resolveWorkspaceContext(request)
    if (!authCtx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createComplaintSchema.parse(body)

    let tenantProfile = await prisma.tenantProfile.findFirst({
      where: { user_id: authCtx.userId, workspace_id: authCtx.workspaceId },
    })

    // If admin creating ticket on behalf
    if (!tenantProfile && (authCtx.role === 'WORKSPACE_ADMIN' || authCtx.role === 'MANAGER' || authCtx.role === 'STAFF')) {
      tenantProfile = await prisma.tenantProfile.findFirst({
        where: { workspace_id: authCtx.workspaceId },
      })
    }

    if (!tenantProfile) {
      return NextResponse.json({ error: 'Tenant profile not found for ticket creation.' }, { status: 404 })
    }

    const slaDueAt = calculateSlaDueDate(validated.priority)

    const complaint = await prisma.complaint.create({
      data: {
        workspace_id: authCtx.workspaceId,
        tenant_id: tenantProfile.id,
        title: validated.title,
        description: validated.description,
        category: validated.category,
        priority: validated.priority,
        attachment_url: validated.attachmentUrl || null,
        sla_due_at: slaDueAt,
        status: 'OPEN',
      },
      include: {
        tenant: { include: { user: true } },
      },
    })

    await recordComplaintActivity(
      authCtx.workspaceId,
      complaint.id,
      authCtx.userId,
      'CREATE_TICKET',
      null,
      'OPEN',
      `Complaint ticket created with ${validated.priority} priority (SLA due in ${validated.priority === 'URGENT' ? 4 : 24}h).`
    )

    return NextResponse.json({
      message: 'Maintenance ticket created successfully! 🛠️',
      complaint,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('POST Complaint Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create complaint' }, { status: 500 })
  }
}
