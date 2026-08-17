# MASTER ENTERPRISE ARCHITECTURE SPECIFICATION (v3.0)
**PG_SAS — Enterprise Multi-Tenant PG, Hostel & Co-Living Management SaaS Platform**  
*Document Version: 3.0.0 | Security Classification: Restricted / Internal Architecture Baseline*

---

## SECTION 1: EXECUTIVE SUMMARY

### 1.1 Product Vision
**Pg_SAS** is built to be the definitive, enterprise-grade cloud operating system for multi-tenant Student Housing, Paying Guest (PG) Accommodations, Hostels, and Co-Living Real Estate chains. The platform bridges physical asset management with double-entry financial ledger execution, tokenized tenant onboarding, dynamic slot meal logistics, and automated multi-channel debt collection into a unified, high-availability SaaS platform.

```mermaid
graph TD
    Vision["Pg_SAS Unified Vision"] --> Asset["Physical Asset & Bed Inventory OS"]
    Vision --> Ledger["Double-Entry Financial Ledger"]
    Vision --> Onboarding["Digital KYC & Lease FSM"]
    Vision --> Logistics["Mess & Kitchen Slot Analytics"]
    Vision --> Collection["Automated Debt & Billing Gateway"]
```

### 1.2 Business Goal
To empower single-branch property owners and enterprise hospitality chains (10,000+ beds) with an operational foundation that reduces revenue leakage to **0%**, automates 95% of recurring monthly invoicing, eliminates manual paper KYC compliance, and maintains sub-second operational response times across global property networks.

### 1.3 Problem Statement
The co-living and student housing industry suffers from key structural inefficiencies:
1. **Financial Leakage & Off-Ledger Rent Collection**: Manual cash receipts and unlinked UPI transfers lead to unrecorded security deposits and delayed rent recognition.
2. **Bed Occupancy State Inconsistency**: Disconnects between front-desk bookings, active leases, and actual physical bed occupancy result in double-booking or unmonitored vacancy.
3. **Food Waste & Kitchen Logistics Misalignment**: Fixed meal preparation without dynamic cutoffs leads to massive kitchen cost overruns (25-40% food wastage).
4. **Tenant Onboarding Bottlenecks**: Manual document verification delays admissions, creates regulatory compliance risk, and lacks verifiable digital audit trails.

### 1.4 Target Scale & SLA Targets
| Metric | Year 1 Target | Enterprise Multi-Region Scale | Target SLA / Threshold |
| :--- | :--- | :--- | :--- |
| **Active Workspaces** | 500 Workspaces | 10,000 Workspaces | 99.95% Availability |
| **Total Managed Beds** | 25,000 Beds | 1,000,000 Beds | Instant State FSM Sync |
| **Monthly Invoices Generated** | 25,000 Invoices | 1,000,000 Invoices | < 15 mins for 1M batch |
| **API Latency (p95)** | < 120ms | < 80ms | Global CDN Edge Cached |
| **DB Read/Write Latency** | < 15ms / < 30ms | < 5ms (Read Pool) | Read-replica Routing |

---

## SECTION 2: COMPLETE C4 ARCHITECTURAL MODEL

### 2.1 C4 Level 1: System Context Diagram
```mermaid
graph TD
    TenantUser["Resident Tenant"]
    ManagerUser["Property Manager"]
    OwnerUser["Workspace Owner"]
    SuperAdmin["Platform Super Admin"]

    subgraph Pg_SAS_System ["Pg_SAS Multi-Tenant SaaS Platform"]
        WebApp["Web & API Engine"]
    end

    ExtPayment["Payment Gateways (Razorpay / Stripe / PhonePe)"]
    ExtNotification["Notification Gateways (Twilio / SendGrid / WhatsApp)"]
    ExtStorage["Supabase Encrypted Storage"]

    TenantUser --> WebApp
    ManagerUser --> WebApp
    OwnerUser --> WebApp
    SuperAdmin --> WebApp

    WebApp --> ExtPayment
    WebApp --> ExtNotification
    WebApp --> ExtStorage
```

### 2.2 C4 Level 2: Container Diagram
```mermaid
graph TB
    subgraph Client_Boundary ["Client Layer"]
        WebSPA["Next.js React Web App SPA"]
        MobileApp["Future React Native Mobile App"]
    end

    subgraph Edge_Boundary ["Edge Ingress Layer"]
        CDN["Cloudflare Edge WAF & CDN"]
        EdgeAuth["Edge Middleware (Jose Web Crypto)"]
    end

    subgraph Application_Boundary ["Application Server Layer"]
        NextServer["Next.js 14 App Router Server Pods"]
        BackgroundWorker["Asynchronous Background Queue Worker"]
    end

    subgraph Storage_Boundary ["Database & Storage Layer"]
        PgBouncerService["PgBouncer Connection Pooler (Port 6543)"]
        PostgresDB[("Supabase PostgreSQL Multi-Tenant DB")]
        RedisDB[("Redis Memory Cache")]
        S3Bucket[("Supabase S3 Encrypted Object Storage")]
    end

    WebSPA --> CDN
    MobileApp --> CDN
    CDN --> EdgeAuth
    EdgeAuth --> NextServer
    NextServer --> PgBouncerService
    PgBouncerService --> PostgresDB
    NextServer --> RedisDB
    NextServer --> S3Bucket
    BackgroundWorker --> PgBouncerService
```

### 2.3 C4 Level 3: Component Diagram (Invoicing & Financial Subsystem)
```mermaid
graph TD
    subgraph Invoicing_Component ["Invoicing & Financial Subsystem Component"]
        BillingRoute["/api/invoices/generate Route Handler"]
        ProrationEngine["Prorated Rent Calculator"]
        InvoiceNumberGen["Invoice Number Generator (INV-YYYYMM-XXXX)"]
        LedgerPostingService["General Ledger Posting Service"]
        AuditLoggerService["Audit Logger Service"]
    end

    subgraph Persistence ["Persistence Layer"]
        DBInstance[("PostgreSQL Database")]
    end

    BillingRoute --> ProrationEngine
    BillingRoute --> InvoiceNumberGen
    BillingRoute --> LedgerPostingService
    LedgerPostingService --> DBInstance
    BillingRoute --> AuditLoggerService
    AuditLoggerService --> DBInstance
```

### 2.4 C4 Level 4: Deployment Topology Diagram
```mermaid
graph TB
    subgraph Cloud_Provider ["AWS / Multi-Region Cloud Network"]
        subgraph Edge_Network ["Cloudflare Network"]
            WAF["Cloudflare Web Application Firewall"]
        end

        subgraph K8s_Cluster ["Kubernetes Compute Cluster"]
            Ingress["Ingress Controller (Nginx / ALB)"]
            Node1["Pod 1: Next.js App Server"]
            Node2["Pod 2: Next.js App Server"]
            Node3["Pod n: Auto-Scaled Server"]
        end

        subgraph DB_Cluster ["Managed Relational Database Cluster"]
            Pooler["PgBouncer Connection Pooler"]
            DBPrimary[("PostgreSQL Primary DB (Writer)")]
            DBReplica[("PostgreSQL Read Replica")]
        end
    end

    WAF --> Ingress
    Ingress --> Node1
    Ingress --> Node2
    Ingress --> Node3
    Node1 --> Pooler
    Node2 --> Pooler
    Node3 --> Pooler
    Pooler --> DBPrimary
    Pooler -. Read Queries .-> DBReplica
```

---

## SECTION 3: DOMAIN-DRIVEN DESIGN (DDD) CONTEXT MAP

```mermaid
graph TD
    subgraph Bounded_Contexts ["Pg_SAS Domain Bounded Contexts"]
        BC_Identity["Identity & Auth Context<br/>(User, Role, Session, JWTPayload)"]
        BC_Inventory["Physical Inventory Context<br/>(Workspace, Property, Floor, Room, Bed)"]
        BC_Tenant["Tenant & Lease Context<br/>(TenantProfile, Lease, AdmissionInvite)"]
        BC_Finance["Finance & Ledger Context<br/>(Invoice, Payment, LedgerAccount, LedgerJournalEntry)"]
        BC_Kitchen["Mess & Logistics Context<br/>(MealMenu, MealSelection)"]
        BC_Maintenance["Complaint & SLA Context<br/>(Complaint, SLA)"]
        BC_Notification["Notification Context<br/>(NotificationQueue, Template)"]
    end

    BC_Identity -- Shared Kernel --> BC_Tenant
    BC_Inventory -- Upstream/Downstream --> BC_Tenant
    BC_Tenant -- Customer/Supplier --> BC_Finance
    BC_Tenant -- Dependent --> BC_Kitchen
    BC_Tenant -- Dependent --> BC_Maintenance
    BC_Finance -- Event Publisher --> BC_Notification
```

---

## SECTION 4: EVENT ARCHITECTURE & DOMAIN EVENTS

```mermaid
graph LR
    subgraph Event_Publishers ["Domain Event Publishers"]
        E1["TenantAdmitted Event"]
        E2["InvoiceGenerated Event"]
        E3["PaymentReceived Event"]
        E4["ComplaintResolved Event"]
    end

    subgraph Event_Bus ["Message Broker / Event Bus"]
        Bus["Redis Pub/Sub & Worker Event Queue"]
    end

    subgraph Event_Subscribers ["Domain Event Handlers"]
        H1["Ledger Entry Processor"]
        H2["WhatsApp / Email Dispatcher"]
        H3["Analytics Aggregator"]
        H4["Bed FSM Transition Handler"]
    end

    E1 --> Bus
    E2 --> Bus
    E3 --> Bus
    E4 --> Bus

    Bus --> H1
    Bus --> H2
    Bus --> H3
    Bus --> H4
```

---

## SECTION 5: FINITE STATE MACHINE (FSM) DIAGRAMS

### 5.1 Bed Occupancy State Machine (FSM)
```mermaid
stateDiagram-v8
    [*] --> VACANT : Property Setup
    VACANT --> RESERVED : Admission Invite Generated
    RESERVED --> OCCUPIED : Digital Onboarding Completed
    RESERVED --> VACANT : Invite Cancelled / Token Expired
    OCCUPIED --> MAINTENANCE : Room Damage / Renovation
    MAINTENANCE --> VACANT : Repair Completed
    OCCUPIED --> VACANT : Lease Terminated & Move Out
```

### 5.2 Lease Lifecycle State Machine (FSM)
```mermaid
stateDiagram-v8
    [*] --> PENDING : Token Generated
    PENDING --> ACTIVE : Tenant Onboarded & Lease Signed
    ACTIVE --> NOTICE_PERIOD : Move Out Notice Served
    NOTICE_PERIOD --> TERMINATED : Final Settlement Completed
    ACTIVE --> TERMINATED : Early Termination
    TERMINATED --> [*]
```

### 5.3 Invoice Lifecycle State Machine (FSM)
```mermaid
stateDiagram-v8
    [*] --> DRAFT : Billing Run Initiated
    DRAFT --> ISSUED : Issued to Tenant
    ISSUED --> PARTIALLY_PAID : Partial Payment Received
    ISSUED --> PAID : Full Payment Settled
    PARTIALLY_PAID --> PAID : Remaining Balance Settled
    ISSUED --> OVERDUE : Due Date Passed
    PARTIALLY_PAID --> OVERDUE : Due Date Passed
    OVERDUE --> PAID : Overdue Dues Cleared
    ISSUED --> CANCELLED : Voided by Manager
```

### 5.4 Payment Verification State Machine (FSM)
```mermaid
stateDiagram-v8
    [*] --> PENDING : Payment Submitted / Webhook Received
    PENDING --> VERIFIED : Gateway Signature Verified / Proof Approved
    PENDING --> REJECTED : Manual Proof Rejected / Webhook Failed
    VERIFIED --> SETTLED : Cash/AR Ledger Journal Posted
    SETTLED --> [*]
```

### 5.5 Maintenance Complaint State Machine (FSM)
```mermaid
stateDiagram-v8
    [*] --> OPEN : Ticket Submitted by Tenant
    OPEN --> IN_PROGRESS : Assigned to Maintenance Technician
    IN_PROGRESS --> RESOLVED : Repair Completed & Verified
    RESOLVED --> CLOSED : Confirmed by Tenant
    OPEN --> CANCELLED : Duplicate / Invalid Ticket
```

---

## SECTION 6: BUSINESS PROCESS MODEL (BPMN) DIAGRAMS

### 6.1 Admission & Onboarding BPMN Flow
```mermaid
flowchart TD
    Start([Manager initiates Admission]) --> SelectBed[Select Vacant Bed]
    SelectBed --> SetRent[Configure Rent & Security Deposit]
    SetRent --> GenToken[Generate Admission Link]
    GenToken --> SendTenant[Send Admission Token URL to Tenant]
    SendTenant --> TenantForm[Tenant Accesses Portal & Submits KYC + Password]
    TenantForm --> VerifyKYC{KYC & Document Valid?}
    VerifyKYC -- Yes --> CommitAdmission[Atomic Transaction: User, Lease, Bed=OCCUPIED]
    CommitAdmission --> PostDeposit[Post Security Deposit Ledger Entry]
    PostDeposit --> EndOnboarding([Admission Complete & Lease Active])
    VerifyKYC -- No --> RejectForm[Prompt Tenant for Re-upload]
    RejectForm --> TenantForm
```

### 6.2 Billing & Invoice Generation BPMN Flow
```mermaid
flowchart TD
    StartBilling([Trigger Monthly Billing Run]) --> FetchLeases[Fetch Active Leases]
    FetchLeases --> IdempotencyCheck{Invoice Already Generated For Month?}
    IdempotencyCheck -- Yes --> SkipLease[Skip Billing for Lease]
    IdempotencyCheck -- No --> CalcProration[Calculate Prorated Rent & Line Items]
    CalcProration --> CreateInvoice[Create Invoice & Line Items]
    CreateInvoice --> PostLedger[Post Ledger Entry: Debit AR 1200 / Credit Rev 4010]
    PostLedger --> DispatchNotification[Queue WhatsApp/Email Invoice Notification]
    DispatchNotification --> EndBilling([Billing Run Complete])
```

---

## SECTION 7: DETAILED NETWORK TOPOLOGY & INFRASTRUCTURE

```mermaid
graph TB
    subgraph External ["External Traffic"]
        InternetUsers["Web Browsers & Mobile Apps"]
    end

    subgraph Edge ["Edge Layer"]
        CF_WAF["Cloudflare Web Application Firewall"]
        CF_DNS["Cloudflare Managed DNS & SSL"]
    end

    subgraph Compute ["Compute Subnet (VPC Private)"]
        ALB["Application Load Balancer"]
        AppNode1["App Pod 1 (Next.js Node)"]
        AppNode2["App Pod 2 (Next.js Node)"]
        WorkerNode["Async Background Queue Worker"]
    end

    subgraph Database_Subnet ["Database Subnet (Isolated)"]
        PgBouncer["PgBouncer Connection Pooler (6543)"]
        PrimaryPostgres[("Primary PostgreSQL DB (5432)")]
        ReadReplica[("Read Replica PostgreSQL DB")]
        RedisCache[("Redis Memory Cluster")]
    end

    InternetUsers --> CF_DNS
    CF_DNS --> CF_WAF
    CF_WAF --> ALB
    ALB --> AppNode1
    ALB --> AppNode2
    AppNode1 --> PgBouncer
    AppNode2 --> PgBouncer
    WorkerNode --> PgBouncer
    PgBouncer --> PrimaryPostgres
    PgBouncer -. Read Queries .-> ReadReplica
    AppNode1 --> RedisCache
    AppNode2 --> RedisCache
```

---

## SECTION 8: ARCHITECTURE DECISION RECORDS (ADR)

### ADR-001: Adoption of Next.js 14 App Router
- **Status**: APPROVED
- **Context**: Need a modern, unified full-stack framework supporting server-rendered UI, API routes, and stateless edge middleware execution.
- **Decision**: Adopt Next.js 14 App Router.
- **Consequences**: Enables server-side rendering for optimal load speeds, unified API endpoint routing, and seamless edge middleware execution.

### ADR-002: Edge Authentication with Jose Web Crypto
- **Status**: APPROVED
- **Context**: Node.js `jsonwebtoken` uses native C++ `crypto` bindings that throw silently inside Next.js Edge Middleware sandbox, causing login loops.
- **Decision**: Replace `jsonwebtoken` verification in `src/middleware.ts` with Edge-native Web Crypto library `jose` (`jwtVerify`).
- **Consequences**: Ensures 100% reliable, Edge-safe JWT session verification with sub-10ms latency across global edge nodes.

### ADR-003: Double-Entry General Ledger Financial Accounting Engine
- **Status**: MANDATORY
- **Context**: Direct balance mutations lead to untraceable accounting discrepancies and regulatory compliance audit failures.
- **Decision**: Enforce double-entry bookkeeping for every financial event. Invoices debit Accounts Receivable (`1200`) and credit Rental Revenue (`4010`). Payments debit Cash/Bank (`1010`) and credit Accounts Receivable (`1200`).
- **Consequences**: Guarantees zero financial leakage and audit-proof trial balance verification (`SUM(Debits) === SUM(Credits)`).

### ADR-004: Bulk Insertion (`createMany`) for Physical Inventory Provisioning
- **Status**: APPROVED
- **Context**: Creating 40+ beds sequentially in single `tx.bed.create()` calls inside nested loops exceeded database transaction timeouts (5000ms).
- **Decision**: Use Prisma `createMany` for batch bed creation and set transaction timeout to 30,000ms.
- **Consequences**: Reduces bed creation time from 6,000ms to < 150ms, supporting instant provisioning for 1,000+ bed properties.

---

## SECTION 9: ARCHITECTURE REVIEW BOARD DIRECTIVES

1. **Phase 4 Implementation Approval**: The Architecture Review Board hereby approves immediate transition to **Phase 4: BYO Payment Gateway Integration & Manual Proof Approval Queue**.
2. **Ledger Invariant Enforcement**: All upcoming payment webhook processors (Razorpay, Stripe, PhonePe) must strictly trigger the `LedgerJournalEntry` engine to settle Accounts Receivable upon successful transaction verification.
