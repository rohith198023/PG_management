# Feature Flow Handbook
**End-to-End Sequence Diagrams & Business Process Workflows**  
*PG / Hostel Management SaaS Platform (Pg_SAS)*

---

## 1. Overview

This handbook outlines the core end-to-end operational feature workflows of the **Pg_SAS** platform using standard Mermaid sequence diagrams. Each flow documents request sequences, state transitions, validation checks, database transactions, and notifications.

---

## 2. Feature Flow 1: Tenant Admission & Digital KYC Flow

```mermaid
sequenceDiagram
    autonumber
    actor Manager as Workspace Manager
    actor Tenant as Prospective Tenant
    participant Portal as Admission Portal (/admission/[token])
    participant API as Next.js API Routes
    participant Storage as Encrypted KYC Storage
    participant DB as PostgreSQL Database
    participant Ledger as General Ledger Engine

    Manager->>API: Generate Invite Token (tenant email, bed_id, rent, deposit)
    API->>DB: Check Bed Status == VACANT
    API->>DB: Create AdmissionInvite record
    API->>DB: Transition Bed Status -> RESERVED
    API-->>Manager: Return Tokenized URL (/admission/token-xyz)

    Manager->>Tenant: Shares Admission Link via WhatsApp/Email
    Tenant->>Portal: Opens /admission/token-xyz
    Portal->>API: GET /api/tenants/admission/public/[token]
    API->>DB: Validate Token (is_used == false & expires_at > now)
    API-->>Portal: Render Admission Form & Rent/Deposit details

    Tenant->>Portal: Uploads ID Scan (Aadhaar/Passport) & submits password
    Portal->>API: POST /api/tenants/kyc/upload (presigned request)
    API->>Storage: Store Encrypted File
    Storage-->>API: Return Private File Key / URL

    Portal->>API: POST /api/tenants/admission/public/[token]
    
    rect rgb(235, 245, 255)
        note right of API: Atomic Database Transaction
        API->>DB: Create User (Role = TENANT)
        API->>DB: Create TenantProfile (with id_proof_url)
        API->>DB: Create Lease (Status = ACTIVE)
        API->>DB: Update Bed Status -> OCCUPIED
        API->>DB: Increment Room.occupancy count
        API->>Ledger: Post Journal Entry (Debit: Cash/Bank, Credit: Security Deposit Liability)
        API->>DB: Mark AdmissionInvite.is_used = true
    end

    API-->>Portal: Admission Success & Account Created
    Portal-->>Tenant: Redirect to Tenant Dashboard (/tenant)
```

---

## 3. Feature Flow 2: Recurring Rent & Double-Entry Ledger Invoicing Flow

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Scheduled Invoice Cron Job
    participant Engine as Invoicing Engine
    participant DB as PostgreSQL Database
    participant Ledger as General Ledger Engine
    participant Notify as Notification Dispatcher (SMS/WhatsApp)

    Cron->>Engine: Trigger Monthly Rent Invoice Job (e.g., 1st of month)
    Engine->>DB: Query Active Leases (workspace_id, status == ACTIVE)
    
    loop For Each Active Lease
        Engine->>DB: Calculate Prorated Rent / Recurring Utilities
        Engine->>Engine: Generate Unique Invoice Number (INV-YYYYMM-XXXX)
        
        rect rgb(240, 255, 240)
            note right of Engine: Atomic Invoice Creation & Ledger Posting
            Engine->>DB: Create Invoice (Status = ISSUED, Due Date = +7 days)
            Engine->>DB: Create InvoiceLineItems (Rent, Maintenance, Mess)
            Engine->>Ledger: Post Journal Entry (Debit: Accounts Receivable 1200, Credit: Rental Revenue 4010)
        end
        
        Engine->>Notify: Queue Invoice Notification (Tenant ID, Invoice Link)
    end

    Notify-->>Tenant: Send SMS / WhatsApp Rent Invoice Notification
```

---

## 4. Feature Flow 3: Dual Payment Pathways Flow

```mermaid
sequenceDiagram
    autonumber
    actor Tenant as Tenant
    participant App as Tenant Portal
    participant API as Next.js API Routes
    participant Gateway as BYO Payment Gateway (Razorpay/Stripe)
    actor Manager as Workspace Manager
    participant DB as Database
    participant Ledger as Ledger Engine

    alt Pathway A: Automated Payment Gateway (Online)
        Tenant->>App: Click "Pay Online"
        App->>API: POST /api/payments/checkout
        API->>Gateway: Create Payment Order
        Gateway-->>App: Open Gateway SDK Modal
        Tenant->>Gateway: Complete Payment (UPI/Card/NetBanking)
        Gateway->>API: Webhook Call (payment.captured)
        API->>API: Verify Webhook Signature
        API->>DB: Create Payment Record (Status = PAID, Source = GATEWAY)
        API->>DB: Update Invoice Status -> PAID
        API->>Ledger: Debit Operating Cash (1010), Credit Accounts Receivable (1200)
    else Pathway B: Manual UPI / Receipt Upload Queue
        Tenant->>App: Upload Bank Transfer Screenshot & Enter UTR Number
        App->>API: POST /api/payments/manual-proof
        API->>DB: Create Payment Record (Status = PENDING_VERIFICATION, Source = MANUAL_UPLOAD)
        API->>DB: Create PaymentProof record
        API-->>Manager: Alert Pending Verification Queue
        Manager->>API: POST /api/payments/verify (Approve / Reject)
        alt Approved
            API->>DB: Update Payment Status -> PAID
            API->>DB: Update Invoice Status -> PAID
            API->>Ledger: Debit Bank Account (1010), Credit Accounts Receivable (1200)
        else Rejected
            API->>DB: Update Payment Status -> REJECTED
            API->>DB: Record Rejection Reason
        end
    end
```

---

## 5. Feature Flow 4: Dynamic Slot Meal Selection & Kitchen Headcount Flow

```mermaid
sequenceDiagram
    autonumber
    actor Kitchen as Mess Staff / Manager
    actor Tenant as Tenant
    participant App as App View
    participant API as Next.js API Routes
    participant DB as PostgreSQL Database

    Kitchen->>API: POST /api/mess/menu (Date, Slot: LUNCH, Menu Items, Cutoff Time: 10:00 AM)
    API->>DB: Upsert MealMenu Record
    
    Tenant->>App: View Daily Mess Schedule
    App->>API: GET /api/tenant/mess/menu?date=YYYY-MM-DD
    API-->>App: Return Menu Details & Cutoff Status

    alt Before Cutoff Time
        Tenant->>App: Select Choice (VEG / NON_VEG / SKIP)
        App->>API: POST /api/tenant/mess/selection
        API->>DB: Upsert MealSelection Record
        API-->>App: Selection Saved
    else After Cutoff Time Passed
        Tenant->>App: Attempt Selection Change
        App->>API: POST /api/tenant/mess/selection
        API-->>App: HTTP 422 Error ("Cutoff time elapsed for this meal slot")
    end

    Kitchen->>App: View Kitchen Prep Headcount Report
    App->>API: GET /api/mess/analytics/headcount?date=YYYY-MM-DD
    API->>DB: Aggregate MealSelections (COUNT Veg, COUNT Non-Veg, COUNT Skip)
    API-->>Kitchen: Return Headcount Summary (e.g. 45 Veg, 20 Non-Veg, 5 Skip)
```

---

## 6. Feature Flow 5: Maintenance Complaint Resolution Flow

```mermaid
sequenceDiagram
    autonumber
    actor Tenant as Tenant
    actor Staff as Staff / Manager
    participant App as Maintenance Portal
    participant API as Next.js API Routes
    participant DB as PostgreSQL Database

    Tenant->>App: Submit Complaint (Title: "Plumbing Leak", Category: "Plumbing", Priority: HIGH)
    App->>API: POST /api/complaints
    API->>DB: Create Complaint Record (Status = OPEN)
    API-->>Staff: Send Urgent Maintenance Notification

    Staff->>App: View Ticket & Change Status to IN_PROGRESS
    App->>API: PATCH /api/complaints/[id] (Status = IN_PROGRESS)
    API->>DB: Update Complaint Status

    Staff->>App: Resolve Issue & Mark RESOLVED
    App->>API: PATCH /api/complaints/[id] (Status = RESOLVED, Resolution Notes)
    API->>DB: Update Status -> RESOLVED

    Tenant->>App: Confirm Fix & Close Ticket
    App->>API: PATCH /api/complaints/[id] (Status = CLOSED)
    API->>DB: Update Status -> CLOSED
```
