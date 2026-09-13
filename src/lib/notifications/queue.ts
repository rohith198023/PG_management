import { prisma } from '../prisma';
import {
  NotificationChannel,
  NotificationType,
  NotificationPayloadMap,
  NotificationStatus,
} from './types';
import { renderNotificationTemplate } from './templates';
import { dispatchNotification, ChannelDispatcherOptions } from './dispatcher';

export interface EnqueueOptions<T extends NotificationType> {
  workspaceId: string;
  recipientId?: string;
  channel?: NotificationChannel;
  type: T;
  target: string;
  payload: NotificationPayloadMap[T];
  scheduledAt?: Date;
}

export async function enqueueNotification<T extends NotificationType>(
  options: EnqueueOptions<T>
) {
  const channel = options.channel || 'EMAIL';
  const rendered = renderNotificationTemplate(options.type, channel, options.payload);

  const item = await (prisma as any).notificationQueue.create({
    data: {
      workspace_id: options.workspaceId,
      recipient_id: options.recipientId || null,
      channel: channel as any,
      type: options.type as any,
      target: options.target,
      subject: rendered.subject,
      rendered_body: rendered.body,
      payload_json: options.payload as any,
      status: 'PENDING',
      attempts: 0,
      max_retries: 3,
      scheduled_at: options.scheduledAt || new Date(),
    },
  });

  return item;
}

export async function processNotificationQueue(
  workspaceId?: string,
  batchSize: number = 20,
  dispatcherOptions?: ChannelDispatcherOptions
) {
  const now = new Date();
  const whereClause: any = {
    status: { in: ['PENDING'] },
    scheduled_at: { lte: now },
    attempts: { lt: 3 },
  };

  if (workspaceId) {
    whereClause.workspace_id = workspaceId;
  }

  // Fetch pending items
  const pendingItems = await (prisma as any).notificationQueue.findMany({
    where: whereClause,
    take: batchSize,
    orderBy: { scheduled_at: 'asc' },
  });

  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    retried: 0,
    items: [] as any[],
  };

  for (const item of pendingItems) {
    results.processed++;

    // Mark as PROCESSING
    await (prisma as any).notificationQueue.update({
      where: { id: item.id },
      data: { status: 'PROCESSING', attempts: item.attempts + 1 },
    });

    const rendered = {
      subject: item.subject || '',
      body: item.rendered_body,
      plainText: item.rendered_body,
    };

    const dispatchRes = await dispatchNotification(
      item.channel as NotificationChannel,
      item.target,
      rendered,
      dispatcherOptions
    );

    if (dispatchRes.success) {
      // Mark as SENT
      await (prisma as any).notificationQueue.update({
        where: { id: item.id },
        data: {
          status: 'SENT',
          sent_at: new Date(),
          last_error: null,
        },
      });

      // Record in NotificationLog
      await (prisma as any).notificationLog.create({
        data: {
          workspace_id: item.workspace_id,
          queue_id: item.id,
          user_id: item.recipient_id || null,
          channel: item.channel,
          type: item.type,
          target: item.target,
          subject: item.subject,
          body_preview: item.rendered_body.substring(0, 120),
          status: 'SENT',
          provider: dispatchRes.provider,
          provider_ref: dispatchRes.providerRef || null,
          latency_ms: dispatchRes.latencyMs,
        },
      });

      results.sent++;
      results.items.push({ id: item.id, status: 'SENT' });
    } else {
      const attemptsSoFar = item.attempts + 1;
      const isExhausted = attemptsSoFar >= item.max_retries;
      const finalStatus = isExhausted ? 'FAILED' : 'PENDING';

      // Mark as FAILED or back to PENDING for retry
      await (prisma as any).notificationQueue.update({
        where: { id: item.id },
        data: {
          status: finalStatus,
          last_error: dispatchRes.error,
        },
      });

      // Log failure
      await (prisma as any).notificationLog.create({
        data: {
          workspace_id: item.workspace_id,
          queue_id: item.id,
          user_id: item.recipient_id || null,
          channel: item.channel,
          type: item.type,
          target: item.target,
          subject: item.subject,
          body_preview: item.rendered_body.substring(0, 120),
          status: 'FAILED',
          provider: dispatchRes.provider,
          latency_ms: dispatchRes.latencyMs,
          error_details: dispatchRes.error,
        },
      });

      if (isExhausted) {
        results.failed++;
        results.items.push({ id: item.id, status: 'FAILED', error: dispatchRes.error });
      } else {
        results.retried++;
        results.items.push({ id: item.id, status: 'RETRY_PENDING', error: dispatchRes.error });
      }
    }
  }

  return results;
}

export async function retryNotification(queueId: string, workspaceId: string) {
  const item = await (prisma as any).notificationQueue.findFirst({
    where: { id: queueId, workspace_id: workspaceId },
  });

  if (!item) {
    throw new Error('Notification queue item not found');
  }

  const updated = await (prisma as any).notificationQueue.update({
    where: { id: queueId },
    data: {
      status: 'PENDING',
      attempts: 0,
      last_error: null,
      scheduled_at: new Date(),
    },
  });

  return updated;
}
