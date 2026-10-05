import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/crypto';

export interface GatewayCredentials {
  apiKey: string;
  apiSecret: string;
  webhookSecret?: string;
  merchantId?: string;
  isLive: boolean;
}

/**
 * Retrieves and decrypts the gateway credentials for a workspace,
 * falling back to server environment variables if configured.
 */
export async function getGatewayCredentials(
  workspaceId: string,
  gatewayName: string = 'razorpay'
): Promise<GatewayCredentials | null> {
  const normGateway = gatewayName.toLowerCase();

  // 1. Check workspace specific GatewayConfig in DB
  try {
    const config = await prisma.gatewayConfig.findFirst({
      where: {
        workspace_id: workspaceId,
        gateway_name: normGateway,
        is_active: true,
      },
    });

    if (config && config.api_key && config.api_secret_enc) {
      const apiSecret = decryptSecret(config.api_secret_enc);
      const webhookSecret = config.webhook_secret_enc ? decryptSecret(config.webhook_secret_enc) : undefined;
      return {
        apiKey: config.api_key,
        apiSecret,
        webhookSecret,
        merchantId: config.merchant_id || undefined,
        isLive: !config.api_key.startsWith('rzp_test_'),
      };
    }
  } catch (err) {
    console.warn('[getGatewayCredentials] DB config lookup warning:', err);
  }

  // 2. Fallback to platform-wide environment variables
  if (normGateway === 'razorpay') {
    const envKeyId = process.env.RAZORPAY_KEY_ID;
    const envKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const envWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (envKeyId && envKeySecret) {
      return {
        apiKey: envKeyId,
        apiSecret: envKeySecret,
        webhookSecret: envWebhookSecret,
        isLive: !envKeyId.startsWith('rzp_test_'),
      };
    }
  }

  return null;
}

export interface CreateOrderResult {
  orderId: string;
  keyId: string;
  amount: number; // in minor units (paise)
  currency: string;
  isMock: boolean;
}

/**
 * Creates an order on the payment gateway (e.g. Razorpay).
 * If no gateway credentials are configured and environment is not production,
 * safely returns a mock test order for local testing.
 */
export async function createGatewayOrder(params: {
  workspaceId: string;
  amount: number; // in INR rupees
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
  gatewayName?: string;
}): Promise<CreateOrderResult> {
  const { workspaceId, amount, currency = 'INR', receipt, notes = {}, gatewayName = 'razorpay' } = params;
  const amountInPaise = Math.round(amount * 100);

  const creds = await getGatewayCredentials(workspaceId, gatewayName);

  if (creds && creds.apiKey && creds.apiSecret) {
    const authHeader = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt,
        notes: {
          workspace_id: workspaceId,
          ...notes,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const desc = errorData.error?.description || `Razorpay order creation failed with HTTP ${response.status}`;
      throw new Error(desc);
    }

    const orderData = await response.json();
    return {
      orderId: orderData.id,
      keyId: creds.apiKey,
      amount: orderData.amount,
      currency: orderData.currency,
      isMock: false,
    };
  }

  // If no credentials and not production, return simulated order for dev/sandbox
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Payment gateway credentials are not configured for this workspace.');
  }

  const mockOrderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    orderId: mockOrderId,
    keyId: 'rzp_test_simulated_key',
    amount: amountInPaise,
    currency,
    isMock: true,
  };
}

/**
 * Verifies the payment signature returned by the client upon checkout completion.
 */
export async function verifyGatewayPaymentSignature(params: {
  workspaceId: string;
  orderId: string;
  paymentId: string;
  signature: string;
  gatewayName?: string;
}): Promise<boolean> {
  const { workspaceId, orderId, paymentId, signature, gatewayName = 'razorpay' } = params;

  // Handle mock orders in non-production
  if (orderId.startsWith('order_sim_') && process.env.NODE_ENV !== 'production') {
    return true;
  }

  const creds = await getGatewayCredentials(workspaceId, gatewayName);
  if (!creds || !creds.apiSecret) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', creds.apiSecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
}

/**
 * Initiates a refund via the gateway if configured.
 */
export async function refundGatewayPayment(params: {
  workspaceId: string;
  paymentRef: string;
  amount?: number; // in rupees
  notes?: Record<string, string>;
  gatewayName?: string;
}): Promise<{ refundId: string; status: string }> {
  const { workspaceId, paymentRef, amount, notes = {}, gatewayName = 'razorpay' } = params;
  const creds = await getGatewayCredentials(workspaceId, gatewayName);

  if (creds && creds.apiKey && creds.apiSecret && !paymentRef.startsWith('pay_sim_')) {
    const authHeader = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString('base64');
    const body: any = { notes };
    if (amount) body.amount = Math.round(amount * 100);

    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentRef}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.description || `Refund failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      refundId: data.id,
      status: data.status,
    };
  }

  return {
    refundId: `rfd_sim_${Date.now()}`,
    status: 'processed',
  };
}
