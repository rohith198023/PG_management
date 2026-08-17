import { prisma } from '@/lib/prisma'
import { ComplaintPriority, ComplaintStatus } from '@prisma/client'

export function calculateSlaDueDate(priority: ComplaintPriority): Date {
  const now = new Date()
  let hours = 48 // Default MEDIUM

  switch (priority) {
    case 'URGENT':
      hours = 4
      break
    case 'HIGH':
      hours = 24
      break
    case 'MEDIUM':
      hours = 48
      break
    case 'LOW':
      hours = 72
      break
  }

  return new Date(now.getTime() + hours * 60 * 60 * 1000)
}

export async function recordComplaintActivity(
  workspaceId: string,
  complaintId: string,
  userId: string | null,
  action: string,
  oldStatus: ComplaintStatus | null = null,
  newStatus: ComplaintStatus | null = null,
  notes: string | null = null
) {
  try {
    await prisma.complaintActivity.create({
      data: {
        workspace_id: workspaceId,
        complaint_id: complaintId,
        user_id: userId,
        action,
        old_status: oldStatus,
        new_status: newStatus,
        notes,
      },
    })
  } catch (err) {
    console.error('Failed to log complaint activity:', err)
  }
}
