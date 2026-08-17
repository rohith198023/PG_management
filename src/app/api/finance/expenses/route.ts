/**
 * @route /api/finance/expenses
 * Expense Voucher HTTP handlers.
 *
 * Single Responsibility: Only handles HTTP concerns (parse request, call service, return response).
 * All business logic lives in @/lib/expenses/service.ts
 * All validation lives in @/lib/expenses/schema.ts
 * All database I/O lives in @/lib/expenses/repository.ts
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { createExpenseSchema, approveExpenseSchema } from '@/lib/expenses/schema';
import { createExpense, approveExpense, rejectExpense } from '@/lib/expenses/service';
import { getExpenseRepository } from '@/lib/expenses/repository';

const ADMIN_ROLES = ['WORKSPACE_ADMIN', 'MANAGER', 'PLATFORM_SUPER_ADMIN'] as const;

// ─── GET /api/finance/expenses ─────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const repo     = getExpenseRepository();
    const expenses = await repo.findAll(auth.session.workspaceId);

    const totalExpenseAmount = expenses
      .filter((e) => e.status === 'APPROVED')
      .reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      expenses,
      metrics: { totalExpenseAmount, count: expenses.length },
    });
  } catch (error: any) {
    console.error('[GET /expenses]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expenses', expenses: [] },
      { status: 500 }
    );
  }
}

// ─── POST /api/finance/expenses ────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const body      = await req.json();
    const validated = createExpenseSchema.parse(body);

    const { expenseId, autoApproved } = await createExpense({
      workspaceId:   auth.session.workspaceId,
      userId:        auth.session.userId,
      userRole:      auth.session.role,
      title:         validated.title,
      category:      validated.category,
      amount:        validated.amount,
      taxAmount:     validated.taxAmount ?? 0,
      vendorName:    validated.vendorName,
      paymentMethod: validated.paymentMethod,
      receiptUrl:    validated.receiptUrl,
      notes:         validated.notes,
    });

    return NextResponse.json(
      {
        message: autoApproved
          ? 'Expense voucher recorded & ledger posted! 🎉'
          : 'Expense voucher submitted for Manager Approval.',
        expenseId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /expenses]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record expense' },
      { status: error.name === 'ZodError' ? 400 : 500 }
    );
  }
}

// ─── PATCH /api/finance/expenses ───────────────────────────────────────────────

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    if (!(ADMIN_ROLES as readonly string[]).includes(auth.session.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Manager or Admin role required to approve expenses' },
        { status: 403 }
      );
    }

    const body      = await req.json();
    const validated = approveExpenseSchema.parse(body);

    if (validated.action === 'APPROVE') {
      await approveExpense({
        expenseId:   validated.expenseId,
        workspaceId: auth.session.workspaceId,
      });
      return NextResponse.json({ message: 'Expense approved & posted to General Ledger! 🎉' });
    } else {
      await rejectExpense({
        expenseId:   validated.expenseId,
        workspaceId: auth.session.workspaceId,
      });
      return NextResponse.json({ message: 'Expense rejected.' });
    }
  } catch (error: any) {
    console.error('[PATCH /expenses]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update expense status' },
      { status: error.name === 'ZodError' ? 400 : 500 }
    );
  }
}
