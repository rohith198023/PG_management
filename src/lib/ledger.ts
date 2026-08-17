/**
 * @module ledger
 * Public API for the Ledger subsystem.
 *
 * This file is a backward-compatible barrel. All existing imports such as:
 *   import { postLedgerEntry } from '@/lib/ledger'
 * continue to work unchanged.
 *
 * For new code, prefer importing from the specific sub-module:
 *   import { postLedgerEntry }            from '@/lib/ledger/posting'
 *   import { getTrialBalanceStatement }   from '@/lib/ledger/reports'
 *   import { initializeWorkspaceLedgerAccounts } from '@/lib/ledger/coa'
 */

export * from './ledger/coa';
export * from './ledger/posting';
export * from './ledger/reports';
