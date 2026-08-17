import { NextResponse } from 'next/server'
import { dbGetWeeklyTemplate, dbUpsertWeeklyTemplateItem } from '@/lib/mess/mess_db'
import { recordMealAuditLog } from '@/lib/mess/mess_engine'
import { resolveWorkspaceContext } from '@/lib/workspace-context'

export async function GET(request: Request) {
  try {
    const ctx = await resolveWorkspaceContext(request)
    if (!ctx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
    }

    const template = await dbGetWeeklyTemplate(ctx.workspaceId)
    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('GET Meal Template Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch weekly template' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveWorkspaceContext(request)
    if (!ctx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized: Missing workspace_id' }, { status: 401 })
    }

    if (ctx.role !== 'WORKSPACE_ADMIN' && ctx.role !== 'MANAGER' && ctx.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin or Manager role required' }, { status: 403 })
    }

    const body = await request.json()
    const { dayOfWeek, slot, title, description, vegAvailable, nonVegAvailable, vegPrice, nonVegPrice, isSpecial, specialTag, items } = body

    const template = await dbGetWeeklyTemplate(ctx.workspaceId)

    const item = await dbUpsertWeeklyTemplateItem({
      workspaceId: ctx.workspaceId,
      templateId: template.id,
      dayOfWeek,
      slot,
      title,
      description,
      vegAvailable: vegAvailable ?? true,
      nonVegAvailable: nonVegAvailable ?? false,
      vegPrice: Number(vegPrice ?? 60),
      nonVegPrice: Number(nonVegPrice ?? 90),
      isSpecial: isSpecial ?? false,
      specialTag: specialTag || null,
      items: items || [],
    })

    await recordMealAuditLog(ctx.workspaceId, ctx.userId || '', 'UPDATE_WEEKLY_TEMPLATE', null, {
      dayOfWeek,
      slot,
      title,
    })

    return NextResponse.json({ message: 'Weekly template slot updated successfully! 📅', item })
  } catch (error: any) {
    console.error('POST Meal Template Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update weekly template' }, { status: 500 })
  }
}
