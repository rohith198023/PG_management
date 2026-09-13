export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';

export type NotificationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export type NotificationType =
  | 'INVOICE_ISSUED'
  | 'INVOICE_OVERDUE'
  | 'PAYMENT_RECEIPT'
  | 'PAYMENT_PENDING'
  | 'ONBOARDING_INVITE'
  | 'COMPLAINT_UPDATE'
  | 'MEAL_CUTOFF_REMINDER'
  | 'GENERAL_ALERT';

export interface BaseNotificationPayload {
  workspaceId: string;
  workspaceName?: string;
  recipientId?: string;
  recipientName: string;
  target: string; // Email, E.164 phone, or user UUID
}

export interface InvoiceIssuedPayload extends BaseNotificationPayload {
  invoiceNumber: string;
  amount: number | string;
  dueDate: string;
  month: string;
  paymentUrl: string;
  lineItems?: Array<{ description: string; amount: number }>;
}

export interface InvoiceOverduePayload extends BaseNotificationPayload {
  invoiceNumber: string;
  amount: number | string;
  daysOverdue: number;
  lateFee?: number | string;
  paymentUrl: string;
}

export interface PaymentReceiptPayload extends BaseNotificationPayload {
  receiptNumber: string;
  invoiceNumber: string;
  amountPaid: number | string;
  paymentMethod: string;
  transactionRef: string;
  paymentDate: string;
  receiptUrl?: string;
}

export interface OnboardingInvitePayload extends BaseNotificationPayload {
  inviteToken: string;
  inviteUrl: string;
  propertyName: string;
  roomName: string;
  bedName: string;
  rentAmount: number | string;
  expiresAt: string;
}

export interface ComplaintUpdatePayload extends BaseNotificationPayload {
  ticketId: string;
  title: string;
  oldStatus?: string;
  newStatus: string;
  priority: string;
  assignedStaffName?: string;
  updateNotes?: string;
}

export interface MealCutoffReminderPayload extends BaseNotificationPayload {
  mealDate: string;
  slotType: string;
  cutoffTime: string;
  menuHighlights: string[];
  portalUrl: string;
}

export interface GeneralAlertPayload extends BaseNotificationPayload {
  title: string;
  message: string;
  actionUrl?: string;
}

export type NotificationPayloadMap = {
  INVOICE_ISSUED: InvoiceIssuedPayload;
  INVOICE_OVERDUE: InvoiceOverduePayload;
  PAYMENT_RECEIPT: PaymentReceiptPayload;
  PAYMENT_PENDING: BaseNotificationPayload & { invoiceNumber: string; amount: number | string; paymentProofId: string };
  ONBOARDING_INVITE: OnboardingInvitePayload;
  COMPLAINT_UPDATE: ComplaintUpdatePayload;
  MEAL_CUTOFF_REMINDER: MealCutoffReminderPayload;
  GENERAL_ALERT: GeneralAlertPayload;
};

export interface RenderedMessage {
  subject: string;
  body: string;
  plainText?: string;
  htmlBody?: string;
  whatsAppTemplate?: {
    templateName: string;
    parameters: Record<string, string>;
  };
}

export interface DispatchResult {
  success: boolean;
  provider: string;
  providerRef?: string;
  error?: string;
  latencyMs: number;
}
