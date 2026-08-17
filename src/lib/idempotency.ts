import { prisma } from './prisma';

/**
 * Checks if an idempotency key has already been processed or is in-flight.
 */
export async function checkIdempotency(key: string, workspaceId: string) {
  if (!key) return null;

  const existingIntent = await prisma.paymentIntent.findUnique({
    where: { idempotency_key: key },
  });

  if (existingIntent) {
    return {
      isDuplicate: true,
      intent: existingIntent,
      status: existingIntent.status,
    };
  }

  const existingPayment = await prisma.payment.findUnique({
    where: { idempotency_key: key },
  });

  if (existingPayment) {
    return {
      isDuplicate: true,
      payment: existingPayment,
      status: existingPayment.status,
    };
  }

  return { isDuplicate: false };
}
