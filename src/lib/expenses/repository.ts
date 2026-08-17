/**
 * @module expenses/repository
 * Data-access layer for the Expense entity.
 *
 * Single Responsibility: Only handles database I/O for Expense records.
 * Dependency Inversion: Implements IExpenseRepository — callers depend on the
 *   interface, not on Prisma or raw SQL directly.
 */

import { prisma } from '@/lib/prisma';

// ─── Interface (abstraction) ──────────────────────────────────────────────────

export interface ExpenseRecord {
  id: string;
  workspace_id: string;
  title: string;
  category: string;
  amount: number;
  tax_amount: number;
  vendor_name: string | null;
  payment_method: string;
  status: string;
  notes: string | null;
  expense_date: Date | string;
}

export interface CreateExpenseInput {
  id: string;
  workspace_id: string;
  title: string;
  category: string;
  amount: number;
  tax_amount: number;
  vendor_name?: string;
  payment_method: string;
  receipt_url?: string;
  notes?: string;
  status: string;
  created_by_id: string;
}

export interface IExpenseRepository {
  ensureTableExists(): Promise<void>;
  findAll(workspaceId: string): Promise<ExpenseRecord[]>;
  findById(id: string, workspaceId: string): Promise<ExpenseRecord | null>;
  create(data: CreateExpenseInput): Promise<void>;
  updateStatus(id: string, workspaceId: string, status: string): Promise<void>;
}

// ─── Concrete Implementation (Prisma + raw SQL) ───────────────────────────────

let _tableReady = false;

class PrismaExpenseRepository implements IExpenseRepository {
  async ensureTableExists(): Promise<void> {
    if (_tableReady) return;
    try {
      await prisma.$queryRawUnsafe(`SELECT 1 FROM "Expense" LIMIT 1;`);
      _tableReady = true;
    } catch {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Expense" (
            "id"              VARCHAR(255) PRIMARY KEY,
            "workspace_id"    VARCHAR(255) NOT NULL,
            "category"        VARCHAR(100) NOT NULL DEFAULT 'OTHER',
            "title"           VARCHAR(255) NOT NULL,
            "amount"          NUMERIC(10, 2) NOT NULL,
            "tax_amount"      NUMERIC(10, 2) NOT NULL DEFAULT 0,
            "vendor_name"     VARCHAR(255),
            "payment_method"  VARCHAR(100) NOT NULL DEFAULT 'BANK_TRANSFER',
            "receipt_url"     TEXT,
            "status"          VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
            "notes"           TEXT,
            "created_by_id"   VARCHAR(255),
            "approved_by_id"  VARCHAR(255),
            "bank_account_id" VARCHAR(255),
            "expense_date"    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            "created_at"      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            "updated_at"      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);
        _tableReady = true;
      } catch (err) {
        console.warn('[ExpenseRepository] Table setup warning:', err);
      }
    }
  }

  async findAll(workspaceId: string): Promise<ExpenseRecord[]> {
    await this.ensureTableExists();
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM "Expense" WHERE workspace_id::text = $1 ORDER BY created_at DESC`,
        workspaceId
      ) as any[];
      return rows.map(this._format);
    } catch (e) {
      console.error('[ExpenseRepository] findAll error:', e);
      return [];
    }
  }

  async findById(id: string, workspaceId: string): Promise<ExpenseRecord | null> {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, title, category, amount, tax_amount, vendor_name, payment_method, status, notes, expense_date
         FROM "Expense" WHERE id = $1 AND workspace_id::text = $2 LIMIT 1`,
        id,
        workspaceId
      ) as any[];
      return rows?.[0] ? this._format(rows[0]) : null;
    } catch (e) {
      console.error('[ExpenseRepository] findById error:', e);
      return null;
    }
  }

  async create(data: CreateExpenseInput): Promise<void> {
    await this.ensureTableExists();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Expense"
         (id, workspace_id, title, category, amount, tax_amount,
          vendor_name, payment_method, receipt_url, notes, status, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      data.id,
      data.workspace_id,
      data.title,
      data.category,
      data.amount,
      data.tax_amount,
      data.vendor_name ?? null,
      data.payment_method,
      data.receipt_url ?? null,
      data.notes ?? null,
      data.status,
      data.created_by_id
    );
  }

  async updateStatus(id: string, workspaceId: string, status: string): Promise<void> {
    await prisma.$executeRawUnsafe(
      `UPDATE "Expense" SET status = $1, updated_at = NOW()
       WHERE id = $2 AND workspace_id::text = $3`,
      status,
      id,
      workspaceId
    );
  }

  private _format(row: any): ExpenseRecord {
    return {
      id:             String(row.id),
      workspace_id:   String(row.workspace_id),
      title:          String(row.title || 'Expense Item'),
      category:       String(row.category || 'OTHER'),
      amount:         Number(row.amount || 0),
      tax_amount:     Number(row.tax_amount || 0),
      vendor_name:    row.vendor_name ? String(row.vendor_name) : null,
      payment_method: String(row.payment_method || 'BANK_TRANSFER'),
      status:         String(row.status || 'PENDING'),
      notes:          row.notes ? String(row.notes) : null,
      expense_date:   row.expense_date ?? row.created_at ?? new Date().toISOString(),
    };
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────
// In production this returns the Prisma implementation.
// In tests, swap this with a mock by calling setExpenseRepository().

let _instance: IExpenseRepository = new PrismaExpenseRepository();

export function getExpenseRepository(): IExpenseRepository {
  return _instance;
}

/** Test helper: inject a mock repository without touching production code. */
export function setExpenseRepository(repo: IExpenseRepository): void {
  _instance = repo;
}
