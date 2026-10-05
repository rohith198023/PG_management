import api from './api';
import type {
  DashboardStats,
  Property,
  Tenant,
  Invoice,
  Complaint,
  Payment,
  NotificationItem,
} from '@/types';

// ── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get<DashboardStats>('/api/dashboard/stats');
  return data;
};

// ── Properties ───────────────────────────────────────────────────────────────
export const getProperties = async (): Promise<Property[]> => {
  const { data } = await api.get<{ properties: Property[] }>('/api/properties');
  return data.properties;
};

// ── Tenants ──────────────────────────────────────────────────────────────────
export const getTenants = async (): Promise<Tenant[]> => {
  const { data } = await api.get<{ tenants: Tenant[] }>('/api/tenants');
  return data.tenants;
};

// ── Invoices ─────────────────────────────────────────────────────────────────
export const getInvoices = async (params?: { status?: string; tenantId?: string }) => {
  const { data } = await api.get('/api/invoices', { params });
  return data as { invoices: Invoice[]; metrics: any };
};

export const getTenantInvoices = async () => {
  const { data } = await api.get<{ invoices: Invoice[]; tenant: any }>('/api/tenant/invoices');
  return data;
};

export const runBillingEngine = async () => {
  const { data } = await api.post<{
    message: string;
    generatedCount: number;
    totalBilled: number;
    skippedCount?: number;
  }>('/api/invoices/generate');
  return data;
};

export const createManualInvoice = async (body: {
  tenantId: string;
  description: string;
  amount: number;
  dueDateDays?: number;
}) => {
  const { data } = await api.post('/api/invoices', body);
  return data;
};

// ── Complaints ───────────────────────────────────────────────────────────────
export const getComplaints = async (params?: {
  status?: string;
  priority?: string;
  category?: string;
}) => {
  const { data } = await api.get<{ complaints: Complaint[] }>('/api/complaints', { params });
  return data.complaints;
};

export const createComplaint = async (body: {
  title: string;
  description: string;
  category?: string;
  priority?: string;
}) => {
  const { data } = await api.post('/api/complaints', body);
  return data;
};

export const updateComplaint = async (
  id: string,
  body: {
    status?: string;
    assignedStaffId?: string;
    resolutionNotes?: string;
    priority?: string;
  }
) => {
  const { data } = await api.patch(`/api/complaints/${id}`, body);
  return data;
};

// ── Payments ─────────────────────────────────────────────────────────────────
export const getPayments = async (status: string = 'ALL') => {
  const { data } = await api.get('/api/payments/verify', { params: { status } });
  return data as { payments: Payment[]; metrics: any };
};

export const verifyPayment = async (body: {
  paymentId: string;
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}) => {
  const { data } = await api.post('/api/payments/verify', body);
  return data;
};

// ── Finance / P&L ────────────────────────────────────────────────────────────
export const getPnL = async (params?: { from?: string; to?: string }) => {
  const { data } = await api.get('/api/finance/reports/pnl', { params });
  return data;
};

export const getFinanceAnalytics = async () => {
  const { data } = await api.get('/api/finance/analytics');
  return data;
};

// ── Notifications ────────────────────────────────────────────────────────────
export const getNotifications = async (params?: {
  status?: string;
  channel?: string;
  limit?: number;
}) => {
  const { data } = await api.get('/api/notifications/queue', { params });
  return data as { notifications: NotificationItem[]; stats: Record<string, number> };
};

export const retryNotification = async (id: string) => {
  const { data } = await api.post(`/api/notifications/${id}/retry`);
  return data;
};

// ── Meals ────────────────────────────────────────────────────────────────────
export const getMealConfig = async () => {
  const { data } = await api.get('/api/meals/config');
  return data;
};

export const getMealTemplate = async () => {
  const { data } = await api.get('/api/meals/template');
  return data;
};

export const getMealHeadcount = async (date: string) => {
  const { data } = await api.get('/api/meals/headcount', { params: { date } });
  return data;
};

export const getMealMenu = async (date: string) => {
  const { data } = await api.get('/api/meals/menu', { params: { date } });
  return data;
};

export const selectMealChoice = async (body: { menuId: string; choice: 'VEG' | 'NON_VEG' | 'SKIP' }) => {
  const { data } = await api.post('/api/meals/selection', body);
  return data;
};

export const getMyMealSelections = async (date?: string) => {
  const { data } = await api.get<{ selections: any[] }>('/api/meals/selection', { params: { date } });
  return data;
};

export const uploadPaymentProof = async (body: {
  invoiceId: string;
  proofImageUrl: string;
  utrNumber?: string;
  notes?: string;
}) => {
  const { data } = await api.post('/api/payments/proof', body);
  return data;
};

// ── Admission Invites ────────────────────────────────────────────────────────
export const getAdmissionInvites = async () => {
  const { data } = await api.get('/api/tenants/admission/invite');
  return data;
};

export const createAdmissionInvite = async (body: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bedId: string;
  rentAmount: number;
  depositAmount: number;
  expiresInDays?: number;
}) => {
  const { data } = await api.post('/api/tenants/admission/invite', body);
  return data;
};

// ── Payment Gateways ─────────────────────────────────────────────────────────
export const getGateways = async () => {
  const { data } = await api.get<{ configs: any[] }>('/api/settings/gateways');
  return data.configs;
};

export const testGateway = async (gatewayName: string) => {
  const { data } = await api.post('/api/settings/gateways/test', { gatewayName });
  return data;
};

export const saveGateway = async (body: {
  gatewayName: string;
  apiKey: string;
  apiSecret: string;
  merchantId?: string;
  webhookSecret?: string;
  isActive?: boolean;
}) => {
  const { data } = await api.post('/api/settings/gateways', body);
  return data;
};

// ── Move-Out & Tenancy Lifecycle ─────────────────────────────────────────────

export const processMoveOut = async (
  tenantId: string,
  body: {
    damageDeduction?: number;
    deductionNotes?: string;
    refundMethod?: 'BANK_TRANSFER' | 'UPI' | 'CASH' | 'ADJUSTED';
  }
) => {
  const { data } = await api.post(`/api/tenants/${tenantId}/move-out`, body);
  return data;
};

// ── Team & User Management ───────────────────────────────────────────────────
export const getUsers = async (params?: { role?: string; search?: string }) => {
  const { data } = await api.get<{ users: any[] }>('/api/users', { params });
  return data.users;
};

export const createUser = async (body: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'MANAGER' | 'STAFF';
  password: string;
}) => {
  const { data } = await api.post('/api/users', body);
  return data;
};

export const updateUser = async (
  id: string,
  body: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: string;
    isActive?: boolean;
    newPassword?: string;
  }
) => {
  const { data } = await api.patch(`/api/users/${id}`, body);
  return data;
};

export const deleteUser = async (id: string) => {
  const { data } = await api.delete(`/api/users/${id}`);
  return data;
};

// ── Workspace & Financial Settings ──────────────────────────────────────────
export const getWorkspaceSettings = async () => {
  const { data } = await api.get('/api/settings/workspace');
  return data.workspace;
};

export const updateWorkspaceSettings = async (body: {
  name?: string;
  phone?: string;
  email?: string;
  gstNumber?: string | null;
  logoUrl?: string | null;
  invoicePrefix?: string;
  dueDays?: number;
  lateFeePerDay?: number;
  cgstRate?: number;
  sgstRate?: number;
}) => {
  const { data } = await api.patch('/api/settings/workspace', body);
  return data;
};


