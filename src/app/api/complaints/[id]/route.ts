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

    return NextResponse.json({
      message: 'Complaint ticket updated! 🛠️',
      complaint: updated,
    })
  } catch (error: any) {
    console.error('PATCH Complaint Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update complaint' }, { status: 500 })
  }
}
