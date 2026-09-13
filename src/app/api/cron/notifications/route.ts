import { NextResponse } from 'next/server';
import { processNotificationQueue } from '@/lib/notifications/queue';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  return handleCron();
}

export async function POST(request: Request) {
  return handleCron();
}

async function handleCron() {
  try {
    // Process across all workspaces
    const result = await processNotificationQueue(undefined, 50);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: result,
    });
  } catch (error: any) {
    console.error('Notification cron runner failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
