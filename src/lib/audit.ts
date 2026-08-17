import { prisma } from './prisma';

export interface AuditLogOptions {
  workspaceId: string;
  paymentId?: string;
  userId?: string;
  action: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export async function logPaymentAudit(opts: AuditLogOptions) {
  try {
    const correlationId = opts.correlationId || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await prisma.paymentAudit.create({
      data: {
        workspace_id: opts.workspaceId,
        payment_id: opts.paymentId || null,
        user_id: opts.userId || null,
        action: opts.action,
        old_values: opts.oldValues ? JSON.parse(JSON.stringify(opts.oldValues)) : undefined,
        new_values: opts.newValues ? JSON.parse(JSON.stringify(opts.newValues)) : undefined,
        ip_address: opts.ipAddress || '127.0.0.1',
        user_agent: opts.userAgent || 'Server-Internal',
        correlation_id: correlationId,
      },
    });

    // Also write to general AuditLog for platform consistency
    await prisma.auditLog.create({
      data: {
        workspace_id: opts.workspaceId,
        user_id: opts.userId || null,
        action: `FINANCE_${opts.action.toUpperCase()}`,
        entity: 'Payment',
        entity_id: opts.paymentId || null,
        ip_address: opts.ipAddress || '127.0.0.1',
        details: { correlationId, ...opts.newValues },
      },
    });
  } catch (error) {
    console.error('Failed to write immutable audit record:', error);
  }
}
