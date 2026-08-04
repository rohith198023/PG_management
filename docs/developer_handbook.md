# Developer Handbook
**Code Conventions, Directory Structure, Git Workflows & Multi-Tenant Security Standards**  
*PG / Hostel Management SaaS Platform (Pg_SAS)*

---

## 1. Directory Structure Conventions

```
Pg_SAS/
├── docs/                        # Enterprise Architecture & Feature Handbooks
├── prisma/
│   └── schema.prisma            # Canonical Data Model Definition
├── src/
│   ├── app/
│   │   ├── (auth)/              # Authentication Routes (Login, Register)
│   │   ├── (dashboard)/         # Workspace Admin & Manager Dashboard Pages
│   │   │   ├── properties/      # Inventory Management Views
│   │   │   ├── tenants/         # Tenant Directory & Admission Hub
│   │   │   ├── billing/         # Invoices & Payment Approval Queues
│   │   │   ├── mess/            # Kitchen & Menu Management
│   │   │   └── complaints/      # Maintenance Desk
│   │   ├── admission/           # Tokenized Public Onboarding Portal
│   │   ├── tenant/              # Dedicated Tenant Portal UI
│   │   └── api/                 # Next.js Route Handlers (REST Endpoints)
│   │       ├── auth/
│   │       ├── tenants/
│   │       ├── properties/
│   │       ├── billing/
│   │       ├── mess/
│   │       └── complaints/
│   ├── components/              # Modular & Reusable UI Components
│   └── lib/                     # Infrastructure & Core Utility Libraries
│       ├── db.ts                # Prisma Client Singleton
│       ├── rbac.ts              # Session & Authorization Middleware Helpers
│       ├── ledger.ts            # General Ledger Posting Engine
│       └── utils.ts             # Formatting & Helper Functions
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## 2. Coding Standards & Naming Conventions

### Database & Schema Rules
- Database tables and columns MUST use `snake_case` (e.g. `workspace_id`, `created_at`).
- Primary keys must be UUID v4.
- Every business table must include `created_at`, `updated_at`, and optional `deleted_at` for soft deletion.

### TypeScript / Code Rules
- Code variables, properties, and functions MUST use `camelCase`.
- React Component files use `PascalCase.tsx` (or `page.tsx` / `route.ts` inside App Router folders).
- Enable strict TypeScript validation (`"strict": true` in `tsconfig.json`). No implicit `any` types.

---

## 3. Multi-Tenant Security & Isolation Standards

### Query Isolation Rule
Every Prisma database operation MUST explicitly filter by `workspace_id`.

```typescript
// ✅ CORRECT - Secure multi-tenant query
const room = await prisma.room.findFirst({
  where: {
    id: roomId,
    workspace_id: session.workspaceId,
  },
});

// ❌ WRONG - Security vulnerability (cross-tenant leak potential)
const room = await prisma.room.findUnique({
  where: { id: roomId },
});
```

### RBAC Enforcement Pattern
All Route Handlers must validate authentication and authorization using `requireAuth()` or `requireRole()`:

```typescript
import { requireRole } from '@/lib/rbac';

export async function POST(req: Request) {
  const authResult = await requireRole(req, ['WORKSPACE_ADMIN', 'MANAGER']);
  if (authResult.error) return authResult.response;
  
  const { session } = authResult;
  // Proceed securely using session.workspaceId...
}
```

---

## 4. Git Branching & Commit Conventions

### Branch Strategy
- `main`: Production release branch. Must always be stable and deployable.
- `develop`: Integration branch for active development.
- `feat/[phase-name]`: Feature branches (e.g. `feat/phase3-invoicing-engine`).
- `fix/[bug-description]`: Hotfix or bug resolution branch.

### Conventional Commit Standard
All commit messages must adhere to the Conventional Commits specification:

- `feat(tenants): add presigned KYC document upload API`
- `fix(ledger): correct double-entry calculation on partial payments`
- `docs(handbook): update FSM diagram for lease termination`
- `refactor(rbac): streamline session extraction middleware`
- `test(admission): add cross-tenant invite isolation unit test`

---

## 5. AI Collaboration & Development Rules

1. **Schema Consistency**: Never alter `prisma/schema.prisma` without updating the Canonical Data Model Specification (`docs/canonical_data_model_spec.md`).
2. **No Superficial Symptom Patches**: Fix root causes of errors; never swallow exceptions silently.
3. **Verification**: Always test route handlers and build output (`npm run build`) before declaring a phase execution complete.
