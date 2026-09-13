# Production Operations Runbook
**Pg_SAS — PG / Hostel Multi-Tenant SaaS Platform**  
*Restricted: Operations Team Only*

---

## 1. Environment Variable Checklist

All environment variables must be set before deployment. Missing any will cause runtime failures.

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | ✅ | PgBouncer transaction-mode connection string (port 6543) | `postgresql://postgres.xxx:pass@aws-0-...pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | ✅ | Direct PostgreSQL connection (bypasses PgBouncer, for migrations) | `postgresql://postgres.xxx:pass@aws-0-...supabase.com:5432/postgres` |
| `JWT_SECRET` | ✅ | Minimum 32-char random string for JWT signing | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public-facing base URL | `https://app.pgsas.com` |
| `SUPABASE_URL` | ✅ | Supabase project URL for storage | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-side service role key | `eyJhbGci...` |
| `ENCRYPTION_KEY` | ✅ | 32-byte hex key for AES-256 gateway secret encryption | `openssl rand -hex 32` |
| `CRON_SECRET_KEY` | ✅ | Bearer token to authenticate cron job triggers | `openssl rand -hex 24` |
| `SENTRY_DSN` | ⚠️ Recommended | Sentry project DSN for error monitoring | `https://xxx@oXXX.ingest.sentry.io/xxx` |
| `RAZORPAY_KEY_ID` | Optional | Default Razorpay key (workspace overrides this) | `rzp_live_xxx` |

---

## 2. Database Migration Commands

### First-Time Setup (Development / Staging)
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development only — no migration history)
npx prisma db push

# Seed initial data
npm run db:seed
```

### Production Migrations (Zero-Downtime Expand/Contract Strategy)
```bash
# Step 1: Expand — Add new nullable columns (safe, backward compatible)
npx prisma migrate deploy

# Step 2: Deploy new application code

# Step 3: Contract — Run any cleanup migrations (drop old columns)
# Only after 100% traffic is on new code version
```

> [!WARNING]
> **Never** run `prisma db push` against production. Always use `prisma migrate deploy` with a reviewed migration file.

---

## 3. PgBouncer Connection Pooling

The platform uses Supabase's built-in PgBouncer in **transaction mode** on port **6543**.

### Connection String Format
```
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### Important: Prisma + PgBouncer
- Always add `?pgbouncer=true&connection_limit=1` to `DATABASE_URL`
- Set `DIRECT_URL` (port 5432, no pooler) for schema migrations
- Prisma's `$transaction()` blocks need the **direct URL** for interactive transactions in development

---

## 4. Production Build & Deployment

### Vercel Deployment (Recommended)
```bash
# Set all environment variables in Vercel dashboard
# Deploy via Git push to main branch
git push origin main
```

### Docker Deployment
```bash
# Build the production image
docker build -t pgsas:latest .

# Run with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e JWT_SECRET="..." \
  pgsas:latest
```

### Build Validation
```bash
# Must pass with zero errors before any production deployment
npm run build
```

---

## 5. Cron Job Setup

The following cron jobs must be configured in your deployment platform:

| Job | Schedule | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| Monthly Billing | `0 6 1 * *` | `POST /api/invoices/generate` | Generates rent invoices on the 1st of each month |
| Overdue Sweep | `0 9 * * *` | `POST /api/cron/overdue` | Marks past-due invoices as OVERDUE |

**Authentication**: Both endpoints require the `Authorization: Bearer $CRON_SECRET_KEY` header.

### Vercel Cron (vercel.json)
```json
{
  "crons": [
    { "path": "/api/invoices/generate", "schedule": "0 6 1 * *" },
    { "path": "/api/cron/overdue", "schedule": "0 9 * * *" }
  ]
}
```

---

## 6. Backup & Restore Procedures

### Automated Backups (Supabase)
- **Daily snapshots**: Automatic, retained for **7 days** (free tier) or **35 days** (Pro tier)
- **Point-In-Time Recovery (PITR)**: Available on Pro tier — restores to any second within the retention window

### Manual Backup
```bash
# Full database dump (run against DIRECT_URL)
pg_dump "postgresql://postgres:[PASS]@aws-0-ap-northeast-1.supabase.com:5432/postgres" \
  --format=custom \
  --file=backup_$(date +%Y%m%d).dump
```

### Restore from Backup
```bash
# Restore to target database
pg_restore --clean --no-acl --no-owner \
  -d "postgresql://..." \
  backup_20260801.dump
```

> [!CAUTION]
> Always test restores in a staging environment first. A failed restore against production can cause data loss.

---

## 7. Monitoring & Alerting

### Error Tracking (Sentry)
- Install: `npm install @sentry/nextjs`
- Initialize in `next.config.js` via `withSentryConfig` wrapper
- Set `SENTRY_DSN` environment variable
- Alert thresholds: > 10 errors/minute → PagerDuty alert

### Key Metrics to Monitor (Grafana / Supabase Metrics)
| Metric | Warning Threshold | Critical Threshold |
| :--- | :--- | :--- |
| DB Connection Pool Usage | > 70% | > 90% |
| API P95 Latency | > 500ms | > 2000ms |
| Failed Webhook Rate | > 5% | > 15% |
| Invoice Generation Time | > 5 min | > 12 min |
| Error Rate (5xx) | > 1% | > 5% |

---

## 8. Incident Response Playbook

### P1: Payment Webhook Failures
1. Check `WebhookEvent` table: `SELECT * FROM "WebhookEvent" WHERE status = 'FAILED' ORDER BY created_at DESC LIMIT 20`
2. Verify gateway HMAC secrets are correct in `GatewayConfig` table
3. Check webhook endpoint availability from gateway's IP ranges
4. Replay failed webhooks from gateway dashboard

### P2: Invoice Generation Timeout
1. Check `AuditLog` for batch job completion
2. Verify PgBouncer pool isn't exhausted: `SHOW pools;` on PgBouncer admin console
3. Check `DATABASE_URL` has `?pgbouncer=true&connection_limit=1`
4. Manually trigger for specific workspace: `POST /api/invoices/generate`

### P3: Authentication Failure Loop
1. Verify `JWT_SECRET` env var matches the one used when tokens were issued
2. Check cookie `SameSite` / `Secure` flags in production (requires HTTPS)
3. Clear all sessions: revoke tokens by changing `JWT_SECRET` (forces re-login)

---

## 9. Production E2E Smoke Test Checklist

After every production deployment, run this checklist manually:

- [ ] **Auth**: Register new workspace → Login → Verify JWT cookie set
- [ ] **Inventory**: Create Property with 2 floors, 3 rooms, 2 beds → verify 12 beds created
- [ ] **Onboarding**: Generate admission invite for bed → Complete onboarding form → Verify bed becomes OCCUPIED
- [ ] **Billing**: Trigger `POST /api/invoices/generate` → Verify invoice created with correct amount
- [ ] **Payment**: Submit manual proof screenshot → Verify manager approval queue populated
- [ ] **Ledger**: Check `/accounting` trial balance → Verify Debits = Credits
- [ ] **Dashboard**: Verify KPI cards show non-zero data → AR aging buckets populated
- [ ] **Super-Admin**: Login as PLATFORM_SUPER_ADMIN → Verify workspace listing accessible

---

## 10. Recovery Point & Time Objectives

| Objective | Target | Mechanism |
| :--- | :--- | :--- |
| **RPO** (max data loss) | < 1 minute | Supabase WAL streaming replication |
| **RTO** (recovery time) | < 5 minutes | Supabase auto-failover + DNS switch |
| **Availability Target** | 99.95% | < 4.38 hours downtime/year |
