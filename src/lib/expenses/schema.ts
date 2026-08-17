/**
 * @module expenses/schema
 * Zod validation schemas for Expense API endpoints.
 *
 * Single Responsibility: Only defines and exports request validation shapes.
 * Open/Closed: New endpoints add new schemas here — existing ones never change.
 */

import { z } from 'zod';

export const EXPENSE_CATEGORIES = [
  'UTILITIES',
  'MAINTENANCE',
  'SALARY',
  'INTERNET',
  'TAX',
  'GATEWAY_FEE',
  'REFUND',
  'SUPPLIES',
  'FOOD_MESS',
  'OTHER',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const createExpenseSchema = z.object({
  title:         z.string().min(2, 'Title is required'),
  category:      z.enum(EXPENSE_CATEGORIES),
  amount:        z.number().positive('Amount must be positive'),
  taxAmount:     z.number().nonnegative().optional().default(0),
  vendorName:    z.string().optional(),
  paymentMethod: z.string().default('BANK_TRANSFER'),
  receiptUrl:    z.string().optional(),
  notes:         z.string().optional(),
  bankAccountId: z.string().optional(),
});

export const approveExpenseSchema = z.object({
  expenseId: z.string().min(1, 'Expense ID is required'),
  action:    z.enum(['APPROVE', 'REJECT']),
});
