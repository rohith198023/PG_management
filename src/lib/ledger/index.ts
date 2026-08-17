/**
 * @module ledger/index
 * Barrel re-export — backward-compatible public API for '@/lib/ledger'.
 *
 * Interface Segregation: Consumers that only need posting can import from
 *   '@/lib/ledger/posting' directly. This barrel keeps all existing imports working.
 */

export * from './coa';
export * from './posting';
export * from './reports';
