import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordComplaintActivity } from '@/lib/complaints/complaint_engine'
import { ComplaintStatus, ComplaintPriority } from '@prisma/client'
import { resolveWorkspaceContext } from '@/lib/workspace-context'


export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authCtx = await resolveWorkspaceContext(request)
    if (!authCtx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
    }

    const complaintId = params.id

    const complaint = await prisma.complaint.findFirst({
      where: { id: complaintId, workspace_id: authCtx.workspaceId },
      include: {
        tenant: {
          include: {
            user: true,
            bed: { include: { room: true } },
          },
        },
        assigned_staff: true,
        activities: {
          include: { user: true },
          orderBy: { created_at: 'desc' },
        },
      },
    })

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ complaint })
  } catch (error: any) {
    console.error('GET Complaint Detail Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch complaint detail' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authCtx = await resolveWorkspaceContext(request)
    if (!authCtx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
    }

    const complaintId = params.id
    const body = await request.json()
    const { status, assignedStaffId, resolutionNotes, rating, feedback, priority } = body

    const existing = await prisma.complaint.findFirst({
      where: { id: complaintId, workspace_id: authCtx.workspaceId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Complaint ticket not found' }, { status: 404 })
    }

    const updateData: any = {}
    let oldStatus = existing.status

    if (status && status !== existing.status) {
      updateData.status = status as ComplaintStatus
      if (status === 'RESOLVED') {
        updateData.resolved_at = new Date()
      }
    }

    if (assignedStaffId !== undefined) {
      updateData.assigned_staff_id = assignedStaffId
    }

    if (resolutionNotes) {
      updateData.resolution_notes = resolutionNotes
    }

    if (rating !== undefined) {
      updateData.rating = Number(rating)
    }

    if (feedback) {
      updateData.feedback = feedback
    }

    if (priority && priority !== existing.priority) {
      updateData.priority = priority as ComplaintPriority
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: updateData,
      include: {
        assigned_staff: true,
        tenant: { include: { user: true } },
      },
    })

    // Record Activity
    let actionName = 'UPDATE_TICKET'
    let activityNote = `Ticket updated.`

    if (status && status !== oldStatus) {
      actionName = `STATUS_CHANGED_TO_${status}`
      activityNote = `Status updated from ${oldStatus} to ${status}.`
      if (resolutionNotes) activityNote += ` Note: ${resolutionNotes}`
    } else if (assignedStaffId !== undefined) {
      actionName = 'STAFF_ASSIGNED'
      activityNote = assignedStaffId
        ? `Ticket assigned to staff member.`
        : `Staff assignment removed.`
    } else if (rating !== undefined) {
      actionName = 'TENANT_RATED_AND_CLOSED'
      activityNote = `Resident rated ${rating}/5 stars. Feedback: ${feedback || 'None'}`
    }

    await recordComplaintActivity(
      authCtx.workspaceId,
      complaintId,
      authCtx.userId,
      actionName,
      oldStatus,
      updated.status,
      activityNote
    )

    // Enqueue Tenant Notification
    try {
      const tenantUser = updated.tenant?.user
      if (tenantUser) {
        const recipientName = `${tenantUser.first_name || ''} ${tenantUser.last_name || ''}`.trim() || 'Resident'
        const staffName = updated.assigned_staff ? `${updated.assigned_staff.first_name} ${updated.assigned_staff.last_name}` : undefined

        await (prisma as any).notificationQueue.create({
          data: {
            workspace_id: authCtx.workspaceId,
            recipient_id: tenantUser.id,
            channel: 'IN_APP',
            type: 'COMPLAINT_UPDATE',
            target: tenantUser.id,
            subject: `Update on Ticket #${complaintId.substring(0, 8)}: ${updated.status}`,
            rendered_body: `Your ticket "${updated.title}" status is now ${updated.status}. ${resolutionNotes ? `Notes: ${resolutionNotes}` : ''}`,
            payload_json: {
              workspaceId: authCtx.workspaceId,
              recipientId: tenantUser.id,
              recipientName,
              target: tenantUser.id,
              ticketId: complaintId.substring(0, 8),
              title: updated.title,
              oldStatus,
              newStatus: updated.status,
              priority: updated.priority,
              assignedStaffName: staffName,
              updateNotes: resolutionNotes,
            },
            status: 'PENDING',
            attempts: 0,
            max_retries: 3,
          },
        })
      }
    } catch (notifErr) {
      console.error('Failed to enqueue complaint notification:', notifErr)
    }

    return NextResponse.json({
      message: 'Complaint ticket updated! 🛠️',
      complaint: updated,
    })
  } catch (error: any) {
    console.error('PATCH Complaint Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update complaint' }, { status: 500 })
  }
}
