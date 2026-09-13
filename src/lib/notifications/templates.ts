import {
  NotificationChannel,
  NotificationType,
  NotificationPayloadMap,
  RenderedMessage,
} from './types';

export function renderNotificationTemplate<T extends NotificationType>(
  type: T,
  channel: NotificationChannel,
  payload: NotificationPayloadMap[T]
): RenderedMessage {
  switch (type) {
    case 'INVOICE_ISSUED':
      return renderInvoiceIssued(channel, payload as NotificationPayloadMap['INVOICE_ISSUED']);
    case 'INVOICE_OVERDUE':
      return renderInvoiceOverdue(channel, payload as NotificationPayloadMap['INVOICE_OVERDUE']);
    case 'PAYMENT_RECEIPT':
      return renderPaymentReceipt(channel, payload as NotificationPayloadMap['PAYMENT_RECEIPT']);
    case 'ONBOARDING_INVITE':
      return renderOnboardingInvite(channel, payload as NotificationPayloadMap['ONBOARDING_INVITE']);
    case 'COMPLAINT_UPDATE':
      return renderComplaintUpdate(channel, payload as NotificationPayloadMap['COMPLAINT_UPDATE']);
    case 'MEAL_CUTOFF_REMINDER':
      return renderMealCutoffReminder(channel, payload as NotificationPayloadMap['MEAL_CUTOFF_REMINDER']);
    case 'GENERAL_ALERT':
    default:
      return renderGeneralAlert(channel, payload as NotificationPayloadMap['GENERAL_ALERT']);
  }
}

function renderInvoiceIssued(
  channel: NotificationChannel,
  p: NotificationPayloadMap['INVOICE_ISSUED']
): RenderedMessage {
  const subject = `Invoice ${p.invoiceNumber} Generated for ${p.month} - ${p.workspaceName || 'PG Management'}`;

  if (channel === 'EMAIL') {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b; margin-bottom: 8px;">New Invoice Generated</h2>
        <p style="color: #475569;">Hello <strong>${p.recipientName}</strong>,</p>
        <p style="color: #475569;">Your rent & service invoice for <strong>${p.month}</strong> has been generated.</p>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Invoice Number:</strong> ${p.invoiceNumber}</p>
          <p style="margin: 4px 0;"><strong>Total Amount:</strong> ₹${Number(p.amount).toLocaleString('en-IN')}</p>
          <p style="margin: 4px 0;"><strong>Due Date:</strong> ${p.dueDate}</p>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${p.paymentUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Pay Now</a>
        </div>
      </div>
    `;
    return { subject, body: htmlBody, plainText: `Invoice ${p.invoiceNumber} for ₹${p.amount} due on ${p.dueDate}. Pay at: ${p.paymentUrl}`, htmlBody };
  }

  if (channel === 'SMS') {
    const text = `Hi ${p.recipientName}, Invoice ${p.invoiceNumber} of Rs.${p.amount} for ${p.month} is due by ${p.dueDate}. Pay online: ${p.paymentUrl}`;
    return { subject, body: text, plainText: text };
  }

  if (channel === 'WHATSAPP') {
    const text = `*Invoice Issued* 📋\n\nHi ${p.recipientName},\nYour invoice *${p.invoiceNumber}* for *${p.month}* has been generated.\n\n💰 *Amount:* ₹${p.amount}\n📅 *Due Date:* ${p.dueDate}\n\n👉 *Pay securely:* ${p.paymentUrl}`;
    return {
      subject,
      body: text,
      plainText: text,
      whatsAppTemplate: {
        templateName: 'invoice_issued',
        parameters: { name: p.recipientName, invoice: p.invoiceNumber, amount: String(p.amount), due: p.dueDate, url: p.paymentUrl },
      },
    };
  }

  // IN_APP
  return {
    subject,
    body: `Your invoice ${p.invoiceNumber} for ₹${p.amount} (${p.month}) has been generated and is due on ${p.dueDate}.`,
    plainText: `Your invoice ${p.invoiceNumber} for ₹${p.amount} (${p.month}) has been generated.`,
  };
}

function renderInvoiceOverdue(
  channel: NotificationChannel,
  p: NotificationPayloadMap['INVOICE_OVERDUE']
): RenderedMessage {
  const subject = `URGENT: Invoice ${p.invoiceNumber} is Overdue - ${p.workspaceName || 'PG Management'}`;

  if (channel === 'EMAIL') {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 8px;">
        <h2 style="color: #b91c1c;">Payment Overdue Alert</h2>
        <p style="color: #475569;">Hello <strong>${p.recipientName}</strong>,</p>
        <p style="color: #475569;">Invoice <strong>${p.invoiceNumber}</strong> is currently <strong>${p.daysOverdue} days overdue</strong>.</p>
        <div style="background-color: #fef2f2; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 4px 0;"><strong>Outstanding Amount:</strong> ₹${Number(p.amount).toLocaleString('en-IN')}</p>
          ${p.lateFee ? `<p style="margin: 4px 0;"><strong>Late Fee Applied:</strong> ₹${p.lateFee}</p>` : ''}
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${p.paymentUrl}" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Clear Dues Now</a>
        </div>
      </div>
    `;
    return { subject, body: htmlBody, plainText: `Invoice ${p.invoiceNumber} is ${p.daysOverdue} days overdue. Total ₹${p.amount}. Clear now: ${p.paymentUrl}`, htmlBody };
  }

  if (channel === 'SMS') {
    const text = `URGENT: Hi ${p.recipientName}, Invoice ${p.invoiceNumber} (Rs.${p.amount}) is ${p.daysOverdue} days overdue. Please clear dues immediately: ${p.paymentUrl}`;
    return { subject, body: text, plainText: text };
  }

  if (channel === 'WHATSAPP') {
    const text = `⚠️ *Payment Overdue Alert*\n\nHi ${p.recipientName},\nYour invoice *${p.invoiceNumber}* (₹${p.amount}) is *${p.daysOverdue} days overdue*.\n\nPlease clear your pending balance immediately to prevent late penalties:\n👉 ${p.paymentUrl}`;
    return {
      subject,
      body: text,
      plainText: text,
      whatsAppTemplate: {
        templateName: 'invoice_overdue',
        parameters: { name: p.recipientName, invoice: p.invoiceNumber, amount: String(p.amount), days: String(p.daysOverdue), url: p.paymentUrl },
      },
    };
  }

  return {
    subject,
    body: `URGENT: Invoice ${p.invoiceNumber} for ₹${p.amount} is ${p.daysOverdue} days overdue. Please pay now.`,
  };
}

function renderPaymentReceipt(
  channel: NotificationChannel,
  p: NotificationPayloadMap['PAYMENT_RECEIPT']
): RenderedMessage {
  const subject = `Payment Confirmed: Receipt ${p.receiptNumber} - ${p.workspaceName || 'PG Management'}`;

  if (channel === 'EMAIL') {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #15803d;">Payment Successfully Verified</h2>
        <p style="color: #475569;">Hello <strong>${p.recipientName}</strong>,</p>
        <p style="color: #475569;">We have received and verified your payment for invoice <strong>${p.invoiceNumber}</strong>.</p>
        <div style="background-color: #f0fdf4; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #22c55e;">
          <p style="margin: 4px 0;"><strong>Receipt Number:</strong> ${p.receiptNumber}</p>
          <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ₹${Number(p.amountPaid).toLocaleString('en-IN')}</p>
          <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${p.paymentMethod}</p>
          <p style="margin: 4px 0;"><strong>Transaction Ref / UTR:</strong> ${p.transactionRef}</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${p.paymentDate}</p>
        </div>
        ${p.receiptUrl ? `<div style="text-align: center; margin-top: 24px;"><a href="${p.receiptUrl}" style="background-color: #15803d; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download Receipt</a></div>` : ''}
      </div>
    `;
    return { subject, body: htmlBody, plainText: `Payment of ₹${p.amountPaid} for Invoice ${p.invoiceNumber} confirmed. Receipt: ${p.receiptNumber}`, htmlBody };
  }

  if (channel === 'SMS') {
    const text = `Payment received! Rs.${p.amountPaid} credited for Invoice ${p.invoiceNumber}. Receipt Ref: ${p.receiptNumber}. Thank you!`;
    return { subject, body: text, plainText: text };
  }

  if (channel === 'WHATSAPP') {
    const text = `✅ *Payment Confirmed*\n\nHi ${p.recipientName},\nWe received your payment of *₹${p.amountPaid}* for *${p.invoiceNumber}*.\n\n🧾 *Receipt:* ${p.receiptNumber}\n🔢 *Ref / UTR:* ${p.transactionRef}\n\nThank you!`;
    return {
      subject,
      body: text,
      plainText: text,
      whatsAppTemplate: {
        templateName: 'payment_receipt',
        parameters: { name: p.recipientName, amount: String(p.amountPaid), invoice: p.invoiceNumber, receipt: p.receiptNumber },
      },
    };
  }

  return {
    subject,
    body: `Payment of ₹${p.amountPaid} for Invoice ${p.invoiceNumber} received & verified. Receipt: ${p.receiptNumber}.`,
  };
}

function renderOnboardingInvite(
  channel: NotificationChannel,
  p: NotificationPayloadMap['ONBOARDING_INVITE']
): RenderedMessage {
  const subject = `Your PG Admission Invite - ${p.propertyName} (${p.workspaceName || 'Pg_SAS'})`;

  if (channel === 'EMAIL') {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Welcome! Complete Your Digital KYC</h2>
        <p style="color: #475569;">Hello <strong>${p.recipientName}</strong>,</p>
        <p style="color: #475569;">You have been invited to join <strong>${p.propertyName}</strong>.</p>
        <div style="background-color: #eff6ff; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Property:</strong> ${p.propertyName}</p>
          <p style="margin: 4px 0;"><strong>Room / Bed:</strong> ${p.roomName} / ${p.bedName}</p>
          <p style="margin: 4px 0;"><strong>Monthly Rent:</strong> ₹${Number(p.rentAmount).toLocaleString('en-IN')}</p>
          <p style="margin: 4px 0;"><strong>Invite Valid Until:</strong> ${p.expiresAt}</p>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${p.inviteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Complete Onboarding</a>
        </div>
      </div>
    `;
    return { subject, body: htmlBody, plainText: `Welcome to ${p.propertyName}! Complete your onboarding here: ${p.inviteUrl}`, htmlBody };
  }

  if (channel === 'SMS') {
    const text = `Hi ${p.recipientName}, your room invite at ${p.propertyName} (${p.roomName}/${p.bedName}) is ready. Complete KYC & onboarding: ${p.inviteUrl}`;
    return { subject, body: text, plainText: text };
  }

  if (channel === 'WHATSAPP') {
    const text = `🏠 *PG Admission Invite*\n\nHi ${p.recipientName},\nYou're invited to complete your digital check-in for *${p.propertyName}* (${p.roomName} / ${p.bedName}).\n\n👉 *Complete KYC & Access Portal:* ${p.inviteUrl}\n\n_Expires: ${p.expiresAt}_`;
    return {
      subject,
      body: text,
      plainText: text,
      whatsAppTemplate: {
        templateName: 'onboarding_invite',
        parameters: { name: p.recipientName, property: p.propertyName, room: p.roomName, bed: p.bedName, url: p.inviteUrl },
      },
    };
  }

  return {
    subject,
    body: `Admission invite created for ${p.propertyName} (${p.roomName}/${p.bedName}). Complete onboarding at: ${p.inviteUrl}`,
  };
}

function renderComplaintUpdate(
  channel: NotificationChannel,
  p: NotificationPayloadMap['COMPLAINT_UPDATE']
): RenderedMessage {
  const subject = `Update on Maintenance Ticket #${p.ticketId}: ${p.newStatus}`;

  if (channel === 'EMAIL') {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b;">Maintenance Ticket Status Changed</h2>
        <p style="color: #475569;">Hello <strong>${p.recipientName}</strong>,</p>
        <p style="color: #475569;">Your maintenance request <strong>"${p.title}"</strong> has been updated.</p>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #2563eb; font-weight: bold;">${p.newStatus}</span></p>
          <p style="margin: 4px 0;"><strong>Priority:</strong> ${p.priority}</p>
          ${p.assignedStaffName ? `<p style="margin: 4px 0;"><strong>Assigned To:</strong> ${p.assignedStaffName}</p>` : ''}
          ${p.updateNotes ? `<p style="margin: 4px 0;"><strong>Notes:</strong> ${p.updateNotes}</p>` : ''}
        </div>
      </div>
    `;
    return { subject, body: htmlBody, plainText: `Ticket #${p.ticketId} "${p.title}" status is now ${p.newStatus}. Notes: ${p.updateNotes || 'None'}`, htmlBody };
  }

  if (channel === 'SMS') {
    const text = `Ticket #${p.ticketId} (${p.title}) status updated to: ${p.newStatus}. Notes: ${p.updateNotes || 'Check tenant portal for details'}`;
    return { subject, body: text, plainText: text };
  }

  if (channel === 'WHATSAPP') {
    const text = `🔧 *Maintenance Ticket Update*\n\nHi ${p.recipientName},\nYour ticket *#${p.ticketId}* (*${p.title}*) has been updated to *${p.newStatus}*.\n\n${p.updateNotes ? `📝 *Note:* ${p.updateNotes}\n\n` : ''}Check your tenant dashboard for real-time progress.`;
    return {
      subject,
      body: text,
      plainText: text,
      whatsAppTemplate: {
        templateName: 'complaint_update',
        parameters: { name: p.recipientName, ticket: p.ticketId, status: p.newStatus, note: p.updateNotes || '' },
      },
    };
  }

  return {
    subject,
    body: `Ticket #${p.ticketId} "${p.title}" is now ${p.newStatus}. ${p.updateNotes ? `Notes: ${p.updateNotes}` : ''}`,
  };
}

function renderMealCutoffReminder(
  channel: NotificationChannel,
  p: NotificationPayloadMap['MEAL_CUTOFF_REMINDER']
): RenderedMessage {
  const subject = `Reminder: Cutoff for ${p.slotType} (${p.mealDate}) is Approaching`;
  const text = `Hi ${p.recipientName}, meal selection cutoff for ${p.slotType} on ${p.mealDate} is ${p.cutoffTime}. Update your Veg/Non-Veg/Skip preference now: ${p.portalUrl}`;

  return {
    subject,
    body: text,
    plainText: text,
  };
}

function renderGeneralAlert(
  channel: NotificationChannel,
  p: NotificationPayloadMap['GENERAL_ALERT']
): RenderedMessage {
  return {
    subject: p.title,
    body: p.message,
    plainText: p.message,
  };
}
