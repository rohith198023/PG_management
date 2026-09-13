import { NotificationChannel, RenderedMessage, DispatchResult } from './types';

export interface ChannelDispatcherOptions {
  simulateFailure?: boolean;
  forcedLatencyMs?: number;
}

export async function dispatchNotification(
  channel: NotificationChannel,
  target: string,
  rendered: RenderedMessage,
  options?: ChannelDispatcherOptions
): Promise<DispatchResult> {
  const startTime = Date.now();

  try {
    if (options?.simulateFailure) {
      throw new Error(`Simulated delivery gateway timeout for channel ${channel}`);
    }

    switch (channel) {
      case 'EMAIL':
        return await dispatchEmail(target, rendered);
      case 'SMS':
        return await dispatchSMS(target, rendered);
      case 'WHATSAPP':
        return await dispatchWhatsApp(target, rendered);
      case 'IN_APP':
        return await dispatchInApp(target, rendered);
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  } catch (error: any) {
    return {
      success: false,
      provider: 'SIMULATOR',
      error: error.message || 'Unknown dispatch failure',
      latencyMs: Date.now() - startTime,
    };
  }
}

async function dispatchEmail(target: string, rendered: RenderedMessage): Promise<DispatchResult> {
  const startTime = Date.now();

  // If live SMTP/SendGrid credentials exist, could invoke nodemailer / SendGrid API
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (sendgridApiKey && !sendgridApiKey.startsWith('mock_')) {
    // Production email integration hook
  }

  // Simulator / Fallback Handler
  const latencyMs = Date.now() - startTime + 15;
  return {
    success: true,
    provider: 'SENDGRID_SIMULATOR',
    providerRef: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    latencyMs,
  };
}

async function dispatchSMS(target: string, rendered: RenderedMessage): Promise<DispatchResult> {
  const startTime = Date.now();

  // Validate E.164 phone or local format
  const sanitizedPhone = target.replace(/[^0-9+]/g, '');
  if (!sanitizedPhone) {
    throw new Error('Invalid SMS phone number destination');
  }

  const latencyMs = Date.now() - startTime + 20;
  return {
    success: true,
    provider: 'TWILIO_SMS_SIMULATOR',
    providerRef: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    latencyMs,
  };
}

async function dispatchWhatsApp(target: string, rendered: RenderedMessage): Promise<DispatchResult> {
  const startTime = Date.now();

  const sanitizedPhone = target.replace(/[^0-9+]/g, '');
  if (!sanitizedPhone) {
    throw new Error('Invalid WhatsApp phone number destination');
  }

  const latencyMs = Date.now() - startTime + 25;
  return {
    success: true,
    provider: 'META_WHATSAPP_SIMULATOR',
    providerRef: `wamid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    latencyMs,
  };
}

async function dispatchInApp(target: string, rendered: RenderedMessage): Promise<DispatchResult> {
  return {
    success: true,
    provider: 'IN_APP_BROKER',
    providerRef: `inapp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    latencyMs: 5,
  };
}
