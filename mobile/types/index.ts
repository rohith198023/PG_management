// Shared TypeScript types mirroring the backend response shapes
// Based on actual API inspection of the PG_SAS Next.js backend

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  accessToken: string;
}

export type UserRole =
  | 'PLATFORM_SUPER_ADMIN'
  | 'WORKSPACE_ADMIN'
  | 'MANAGER'
  | 'STAFF'
  | 'TENANT';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  tenantProfile?: any;
}

export interface AuthWorkspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  gstNumber?: string;
}

// Dashboard
export interface DashboardStats {
  occupancy: {
    totalBeds: number;
    occupiedBeds: number;
    vacantBeds: number;
    maintenanceBeds: number;
    reservedBeds: number;
    occupancyPercentage: number;
  };
  financials: {
    todayRevenue: number;
    collectedRent: number;
    pendingRent: number;
    pendingProofCount: number;
    collectionEfficiency: number;
    monthTotalBilled: number;
    monthCollected: number;
    momDelta: number;
    arAging: {
      current: number;
      days1to30: number;
      days31to60: number;
      days60plus: number;
    };
  };
  revenueTrend: { month: string; amount: number }[];
  complaints: {
    open: number;
    inProgress: number;
    resolvedThisMonth: number;
  };
  messHeadcount: {
    vegCount: number;
    nonVegCount: number;
    skippedCount: number;
    totalSelected: number;
  };
}

// Properties
export interface Bed {
  id: string;
  bed_number: string;
  status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';
  deleted_at?: string | null;
}

export interface Room {
  id: string;
  room_number: string;
  capacity: number;
  occupancy: number;
  rent_amount: string;
  deposit_amount: string;
  amenities: string[];
  beds: Bed[];
  deleted_at?: string | null;
}

export interface Floor {
  id: string;
  floor_number: number;
  name: string;
  rooms: Room[];
  deleted_at?: string | null;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  property_type: string;
  amenities: string[];
  floors: Floor[];
  created_at: string;
  deleted_at?: string | null;
}

// Tenants
export interface TenantUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export interface TenantBed {
  id: string;
  bed_number: string;
  status: string;
  room: {
    room_number: string;
    property: {
      name: string;
    };
  };
}

export interface Lease {
  id: string;
  start_date: string;
  end_date?: string;
  rent_amount: string;
  deposit_amount: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
}

export interface Tenant {
  id: string;
  workspace_id: string;
  user_id: string;
  bed_id?: string;
  emergency_contact?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  created_at: string;
  user: TenantUser;
  bed?: TenantBed;
  leases: Lease[];
}

// Invoices
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: string;
  amount: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  amount_paid: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  created_at: string;
  line_items: InvoiceLineItem[];
  tenant?: {
    user: { first_name: string; last_name: string; email: string };
    bed?: { room: { property: { name: string } } };
  };
  payments?: any[];
}

// Complaints
export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  sla_due_at?: string;
  resolved_at?: string;
  resolution_notes?: string | null;
  rating?: number | null;
  feedback?: string | null;
  isBreached: boolean;
  remainingHours: number;
  tenant?: {
    user: { first_name: string; last_name: string };
    bed?: { room: { room_number: string } };
  };
  assigned_staff?: { first_name: string; last_name: string } | null;
}

// Payments
export interface Payment {
  id: string;
  amount: string;
  payment_date: string;
  source: string;
  status: 'PENDING_VERIFICATION' | 'PAID' | 'REJECTED' | 'FAILED';
  transaction_ref?: string;
  created_at: string;
  tenant?: {
    user: { first_name: string; last_name: string };
  };
  invoice?: { invoice_number: string; total_amount: string };
  proof?: {
    utr_number?: string;
    receipt_url?: string;
  };
}

// Finance P&L
export interface PnLReport {
  revenue: number;
  expenses: number;
  profit: number;
  period?: string;
}

// Notifications
export interface NotificationItem {
  id: string;
  channel: string;
  type: string;
  target: string;
  subject?: string;
  rendered_body: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'PROCESSING' | 'CANCELLED';
  attempts: number;
  created_at: string;
  sent_at?: string;
  recipient?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}
