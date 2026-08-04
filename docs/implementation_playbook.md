# Implementation Playbook
**Phase-by-Phase Roadmap, Scope, Manual Setup, Verification Checklists & Testing Protocol**  
*PG / Hostel Management SaaS Platform (Pg_SAS)*

---

## 1. Executive Summary & Phase Matrix

There are **12 Phases** in the master implementation roadmap of **Pg_SAS**. Every phase requires completing specific functional scopes and passing strict verification & exit criteria tests before progressing to the next phase.

| Phase | Phase Name | Status | Key Focus | Exit Gate |
| :--- | :--- | :---: | :--- | :--- |
| **Phase 1** | Core Architecture, Schema & Auth Foundation | **PASSED** | Multi-tenant RBAC, JWT Auth & Base Inventory | Pass Auth & Property tests |
| **Phase 2** | Digital Tenant Onboarding, KYC & Lease Engine | **PASSED** | Tokenized invites, KYC upload, Lease & Deposit Ledger | Pass Onboarding & Bed FSM tests |
| **Phase 3** | Automated Recurring Invoicing Engine & Webhooks | **UPCOMING** | Monthly Invoice Cron, Line Items & Notifications | Pass Invoice Generation & FSM tests |
| **Phase 4** | BYO Payment Gateways & Manual Approval Queue | Scheduled | Razorpay/Stripe Webhooks & Manual Proof Queue | Pass Webhook & Verification tests |
| **Phase 5** | Double-Entry General Ledger & Financial Reports | Scheduled | Trial Balance, Income Statement, Ledger Invariant | Pass Debit=Credit Integrity tests |
| **Phase 6** | Dynamic Slot Mess Management & Kitchen Analytics | Scheduled | Menus, Cutoff Times, Meal Selections & Headcount | Pass Cutoff & Headcount tests |
| **Phase 7** | Incident & Maintenance Complaint Desk | Scheduled | Ticket Lifecycle, SLA, Priority Escalate & Closure | Pass Complaint State FSM tests |
| **Phase 8** | Multi-Channel Automated Notification Dispatch | Scheduled | Email, SMS, WhatsApp Gateway Queue & Templates | Pass Dispatch Queue tests |
| **Phase 9** | Real-time Occupancy & Financial Dashboard | Scheduled | Dynamic Metrics, Collection Trends & Debt Analytics | Pass Dashboard Data Accuracy tests |
| **Phase 10**| Platform Super-Admin & SaaS Subscriptions | Scheduled | Workspace Provisioning, Tier Limits & Global Audit | Pass SaaS Multi-Tenant Limit tests |
| **Phase 11**| Multi-Tenant Security Auditing & Performance | Scheduled | Cross-Tenant Boundary Auditing & Index Optimization | Pass Security Penetration tests |
| **Phase 12**| Production Deployment, Monitoring & Handover | Scheduled | Vercel/Docker, Sentry, PgBouncer & Backup Policies | Pass Production E2E Smoke tests |

---

## 2. Complete Phase Plan & Testing Protocols

---

### Phase 1: Core System Architecture & Multi-Tenant Foundation (PASSED)
- **Scope**: PostgreSQL database provisioning via Prisma ORM, multi-tenant workspace partitioning, JWT authentication, RBAC middleware (`PLATFORM_SUPER_ADMIN`, `WORKSPACE_ADMIN`, `MANAGER`, `STAFF`, `TENANT`), property inventory hierarchy (Workspace -> Property -> Floor -> Room -> Bed).
- **What to Test After Phase 1**:
  - [x] **Auth & Session Isolation**: Register workspace admin, login, verify JWT contains `userId`, `workspaceId`, and `role`.
  - [x] **Property Hierarchy Creation**: Create Property, add Floors, add Rooms with capacity/rent/deposit, add Beds.
  - [x] **Multi-Tenant Security Isolation**: Attempt to access Property using a user session from a different Workspace ID; verify API returns `403 Forbidden` or `404 Not Found`.

---

### Phase 2: Digital Tenant Onboarding, KYC & Lease Management (PASSED)
- **Scope**: Tokenized prospective tenant admission invite engine (`/admission/[token]`), public onboarding portal, presigned encrypted KYC upload API, atomic user/lease creation, bed occupancy FSM state update, and initial deposit ledger entry.
- **What to Test After Phase 2**:
  - [x] **Invite Token Generation**: Manager generates invite for vacant bed; verify Bed status transitions to `RESERVED` and token URL is returned.
  - [x] **Token Validation & Public View**: Access `/admission/[token]`; verify invalid or expired tokens return error view.
  - [x] **Encrypted Document Upload**: Test presigned upload API for ID proof scans (Aadhaar / Passport).
  - [x] **Atomic Admission Execution**: Submit tenant password and KYC form; verify:
    - User account created with `TENANT` role.
    - TenantProfile created with ID proof metadata.
    - Lease created with status `ACTIVE`.
    - Bed status transitions from `RESERVED` to `OCCUPIED`.
    - `Room.occupancy` count increments by 1.
    - Initial deposit entry posted to General Ledger (Debit: 1010 Cash, Credit: 2010 Deposit Liability).
    - `AdmissionInvite.is_used` becomes `true`.

---

### Phase 3: Automated Recurring Invoicing Engine & Webhooks (UPCOMING)
- **Scope**: Cron job for automated monthly recurring invoice creation, line items calculation (Rent + Maintenance + Extras), invoice FSM state transitions (`DRAFT` -> `ISSUED` -> `OVERDUE`), and invoice issue notifications.
- **What to Test After Phase 3**:
  - [ ] **Cron Execution**: Trigger billing cron runner for target month (e.g. 1st of month).
  - [ ] **Invoice Scope Accuracy**: Verify invoices are generated *only* for active leases (`LeaseStatus.ACTIVE`).
  - [ ] **Unique Invoice Numbering**: Verify sequential unique numbers per workspace (e.g., `INV-202608-0001`).
  - [ ] **Line Item Breakdown**: Verify subtotal, tax amount, and total calculation match lease rent + maintenance.
  - [ ] **Ledger Entry Posting**: Verify automatically posted Journal Entry (Debit: Accounts Receivable 1200, Credit: Rental Revenue 4010).
  - [ ] **Overdue Transition Test**: Simulate past `due_date`; verify cron transitions status from `ISSUED` to `OVERDUE`.

---

### Phase 4: BYO Payment Gateway Integration & Manual Approval Queue
- **Scope**: Multi-gateway config (`GatewayConfig` for Razorpay, Cashfree, PhonePe, Stripe), webhook signature verification, manual UPI receipt upload portal (`PaymentProof`), and manager payment verification approval queue.
- **What to Test After Phase 4**:
  - [ ] **Gateway Webhook Handshake**: Trigger simulated gateway payment payload with valid signature; verify payment status changes to `PAID` and invoice updates to `PAID`.
  - [ ] **Webhook Signature Verification**: Send forged signature webhook; verify API rejects with `401 Unauthorized`.
  - [ ] **Manual Proof Submission**: Tenant uploads UPI payment screenshot + UTR number; verify Payment status is set to `PENDING_VERIFICATION`.
  - [ ] **Manager Approval Queue**: Manager reviews pending proof:
    - On Approve: Payment status becomes `PAID`, Invoice updates to `PAID`, Cash/Bank ledger account debited.
    - On Reject: Payment status becomes `REJECTED`, rejection reason recorded, tenant notified.
  - [ ] **Partial Payments**: Pay partial invoice amount; verify Invoice status becomes `PARTIALLY_PAID` and `amount_paid` updates accurately.

---

### Phase 5: Double-Entry General Ledger Financial Engine & Reporting
- **Scope**: Chart of Accounts (`LedgerAccount`), Journal Entries (`LedgerJournalEntry`), double-entry balance enforcement, financial trial balance report, and P&L / Income Statement API.
- **What to Test After Phase 5**:
  - [ ] **Double-Entry Invariant**: Attempt posting an unbalanced journal entry (`debit !== credit`); verify system rejects transaction.
  - [ ] **Trial Balance Aggregation**: Fetch Trial Balance report; verify `SUM(Debits) === SUM(Credits)` across all accounts for the workspace.
  - [ ] **Real-time Balance Sheet & P&L**: Post revenue and expense transactions; verify revenue accounts accurately reflect on Income Statement and cash/receivables reflect on Asset accounts.

---

### Phase 6: Dynamic Slot Mess Management & Kitchen Analytics
- **Scope**: Daily meal menu publisher (`MealMenu`), slot cutoff enforcement, tenant meal choice selection (`VEG`, `NON_VEG`, `SKIP`), and kitchen prep headcount summary report.
- **What to Test After Phase 6**:
  - [ ] **Menu Creation**: Manager publishes menu for Breakfast, Lunch, Dinner with Veg/Non-Veg options and cutoff time.
  - [ ] **Tenant Selection**: Tenant selects choice before cutoff; verify choice recorded in `MealSelection`.
  - [ ] **Cutoff Enforcement**: Attempt to change meal selection *after* `cutoff_time`; verify API blocks request with `422 Unprocessable Entity`.
  - [ ] **Kitchen Headcount Report**: Fetch kitchen summary for a date/slot; verify aggregated counts match exact totals (e.g. 50 Veg, 15 Non-Veg, 5 Skip).

---

### Phase 7: Tenant Incident & Maintenance Complaint Management Desk
- **Scope**: Maintenance complaint desk, priority tagging (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), assignment to staff, FSM state transitions (`OPEN` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`), and resolution SLA tracking.
- **What to Test After Phase 7**:
  - [ ] **Ticket Submission**: Tenant submits maintenance complaint with category & priority.
  - [ ] **Priority Alerts**: Submit `URGENT` priority ticket; verify staff notification is flagged high priority.
  - [ ] **FSM State Lifecycle**: Update status from `OPEN` to `IN_PROGRESS` to `RESOLVED` and finally `CLOSED`.
  - [ ] **Staff Assignment**: Assign ticket to staff member; verify staff dashboard reflects assigned task.

---

### Phase 8: Multi-Channel Automated Notification Dispatch
- **Scope**: Asynchronous email, SMS, and WhatsApp notification queue runner, template engine for invoices, payment receipts, onboarding invites, and complaint updates.
- **What to Test After Phase 8**:
  - [ ] **Queue Processing**: Trigger event (e.g., Invoice Issued); verify notification job added to queue.
  - [ ] **Template Rendering**: Verify dynamic variables (tenant name, amount, due date, link) are rendered correctly.
  - [ ] **Retry Engine**: Simulate gateway network timeout; verify failed notification job retries up to 3 times before marking failed.

---

### Phase 9: Real-time Occupancy & Financial Analytics Dashboard
- **Scope**: Executive analytics dashboard with metrics for total beds vs occupied vs vacant, monthly collection efficiency %, aging accounts receivable, and revenue growth.
- **What to Test After Phase 9**:
  - [ ] **Occupancy Metric Test**: Occupy/vacate beds; verify dashboard total/vacant/occupied counts update accurately.
  - [ ] **Revenue Collection Accuracy**: Pay invoices; verify collection efficiency percentage recalculates instantly.
  - [ ] **Overdue Debt Aging**: Check aging buckets (0-30 days, 31-60 days, 60+ days overdue); verify amounts match unpaid invoices.

---

### Phase 10: Platform Super-Admin Workspace Management & SaaS Billing
- **Scope**: Platform Super-Admin panel (`PLATFORM_SUPER_ADMIN`), multi-workspace creation/suspension, subscription tier management (Bed limits, feature flags), and global audit trail logs.
- **What to Test After Phase 10**:
  - [ ] **Workspace Creation & Provisioning**: Super-Admin provisions a new PG Workspace; verify default Chart of Accounts and Workspace Admin created.
  - [ ] **Tier Limit Enforcement**: Set workspace bed capacity limit to 50; attempt adding 51st bed; verify system blocks addition.
  - [ ] **Workspace Suspension**: Mark workspace `is_active = false`; verify all workspace users are immediately denied access.

---

### Phase 11: End-to-End Multi-Tenant Security Auditing & Performance Tuning
- **Scope**: Automated penetration test suite for multi-tenant data leakage, cross-tenant API authorization testing, database index optimization, and load stress testing.
- **What to Test After Phase 11**:
  - [ ] **Cross-Tenant Attack Simulation**: Run automated test suite forging headers across 100 random endpoints; verify 0 leaks (100% boundary isolation pass).
  - [ ] **Query Execution Benchmark**: Benchmark key list queries (`/api/tenants`, `/api/invoices`); verify response time is under 100ms with proper index coverage.

---

### Phase 12: Production Deployment, Monitoring & Operational Handover
- **Scope**: Production deployment (Vercel / Docker Container), PostgreSQL connection pooling via PgBouncer, Sentry error monitoring integration, database backup automation, and final handover docs.
- **What to Test After Phase 12**:
  - [ ] **Production Build Check**: Execute `npm run build`; verify zero TypeScript or lint errors.
  - [ ] **Production E2E Smoke Test**: Perform complete end-to-end user journey on production domain:
    1. Workspace Registration & Inventory Setup.
    2. Tenant Invite & Public KYC Onboarding.
    3. Invoice Generation & Online/Manual Payment.
    4. Meal Selection & Maintenance Ticket Lifecycle.
  - [ ] **Disaster Recovery**: Test database backup restore procedure.
