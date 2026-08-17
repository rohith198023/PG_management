import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { z } from 'zod';
import { encryptSecret, maskSecret } from '@/lib/crypto';
import { GatewayStatus } from '@prisma/client';

const gatewayConfigSchema = z.object({
  gatewayName: z.enum(['razorpay', 'stripe', 'cashfree', 'phonepe']),
  apiKey: z.string().min(3, 'API Key is required'),
  apiSecret: z.string().min(3, 'API Secret is required'),
  merchantId: z.string().optional(),
  webhookSecret: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;

    const configs = await prisma.gatewayConfig.findMany({
      where: { workspace_id: workspaceId },
    });

    const healths = await prisma.gatewayHealth.findMany({
      where: { workspace_id: workspaceId },
    });

    const safeConfigs = configs.map((c) => {
      const h = healths.find((h) => h.gateway_name === c.gateway_name);
      return {
        id: c.id,
        gateway_name: c.gateway_name,
        is_active: c.is_active,
        status: c.status || GatewayStatus.DRAFT,
        api_key_masked: c.key_mask || maskSecret(c.api_key),
        api_secret_masked: c.secret_mask || maskSecret(c.api_secret_enc),
        merchant_id: c.merchant_id || null,
        last_verified_at: c.last_verified_at,
        health: h
          ? {
              status: h.status,
              avg_latency_ms: h.avg_latency_ms,
              success_rate: h.success_rate,
              webhook_health: h.webhook_health,
            }
          : { status: 'DRAFT', avg_latency_ms: 250, success_rate: 99.9, webhook_health: 'NOT_TESTED' },
        updated_at: c.updated_at,
      };
    });

    return NextResponse.json({ configs: safeConfigs });
  } catch (error: any) {
    console.error('Fetch Gateways Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch gateway configurations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    if (auth.session.role !== 'WORKSPACE_ADMIN' && auth.session.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only Workspace Admins can manage Payment Gateways' }, { status: 403 });
    }

    const workspaceId = auth.session.workspaceId;
    const body = await req.json();
    const validated = gatewayConfigSchema.parse(body);

    const encryptedSecret = encryptSecret(validated.apiSecret);
    const encryptedWebhook = validated.webhookSecret ? encryptSecret(validated.webhookSecret) : null;
    const keyMask = maskSecret(validated.apiKey, 8, 4);
    const secretMask = maskSecret(validated.apiSecret, 6, 4);

    const existing = await prisma.gatewayConfig.findFirst({
      where: {
        workspace_id: workspaceId,
        gateway_name: validated.gatewayName,
      },
    });

    let config;
    if (existing) {
      config = await prisma.gatewayConfig.update({
        where: { id: existing.id },
        data: {
          api_key: validated.apiKey,
          api_secret_enc: encryptedSecret,
          webhook_secret_enc: encryptedWebhook,
          merchant_id: validated.merchantId || null,
          key_mask: keyMask,
          secret_mask: secretMask,
          status: GatewayStatus.TESTING,
          is_active: validated.isActive,
        },
      });
    } else {
      config = await prisma.gatewayConfig.create({
        data: {
          workspace_id: workspaceId,
          gateway_name: validated.gatewayName,
          api_key: validated.apiKey,
          api_secret_enc: encryptedSecret,
          webhook_secret_enc: encryptedWebhook,
          merchant_id: validated.merchantId || null,
          key_mask: keyMask,
          secret_mask: secretMask,
          status: GatewayStatus.TESTING,
          is_active: validated.isActive,
        },
      });
    }

    return NextResponse.json({
      message: `${validated.gatewayName.toUpperCase()} configuration saved. Please click "Test Connection" to complete verification.`,
      config: {
        id: config.id,
        gateway_name: config.gateway_name,
        status: config.status,
        api_key_masked: config.key_mask,
        secret_masked: config.secret_mask,
        is_active: config.is_active,
      },
    });
  } catch (error: any) {
    console.error('Save Gateway Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save gateway configuration' }, { status: 500 });
  }
}
