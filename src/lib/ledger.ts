import { prisma } from '@/lib/prisma'
import { AccountType } from '@prisma/client'

export interface LedgerPosting {
  accountCode: string
  debit: number
  credit: number
  description: string
}

/**
 * Initializes standard Chart of Accounts for a new workspace if missing.
 */
export async function initializeWorkspaceLedgerAccounts(workspaceId: string) {
  const defaultAccounts = [
    { code: '1010', name: 'Operating Cash', type: AccountType.ASSET },
    { code: '1020', name: 'Merchant Gateway Receivable', type: AccountType.ASSET },
    { code: '1030', name: 'Accounts Receivable (Tenant Rent)', type: AccountType.ASSET },
    { code: '2010', name: 'Tenant Security Deposits Held', type: AccountType.LIABILITY },
    { code: '2020', name: 'Unearned / Advance Rent', type: AccountType.LIABILITY },
    { code: '3010', name: 'Owner Equity', type: AccountType.EQUITY },
    { code: '4010', name: 'Rent Revenue', type: AccountType.REVENUE },
    { code: '4020', name: 'Mess / Meal Revenue', type: AccountType.REVENUE },
    { code: '4030', name: 'Utility Charge Revenue', type: AccountType.REVENUE },
    { code: '5010', name: 'Maintenance Expense', type: AccountType.EXPENSE },
  ]

  for (const acc of defaultAccounts) {
    await prisma.ledgerAccount.upsert({
      where: {
        workspace_id_code: {
          workspace_id: workspaceId,
          code: acc.code,
        },
      },
      update: {},
      create: {
        workspace_id: workspaceId,
        code: acc.code,
        name: acc.name,
        type: acc.type,
      },
    })
  }
}

/**
 * Posts double-entry journal entries ensuring Sum(Debits) === Sum(Credits).
 */
export async function postJournalEntries(
  workspaceId: string,
  referenceId: string,
  postings: LedgerPosting[]
) {
  const totalDebits = postings.reduce((sum, p) => sum + p.debit, 0)
  const totalCredits = postings.reduce((sum, p) => sum + p.credit, 0)

  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    throw new Error(`Double-entry balance check failed: Total Debits (${totalDebits}) != Total Credits (${totalCredits})`)
  }

  await initializeWorkspaceLedgerAccounts(workspaceId)

  const entriesToCreate = []
  for (const posting of postings) {
    const account = await prisma.ledgerAccount.findUnique({
      where: {
        workspace_id_code: {
          workspace_id: workspaceId,
          code: posting.accountCode,
        },
      },
    })

    if (!account) {
      throw new Error(`Ledger account code ${posting.accountCode} not found for workspace ${workspaceId}`)
    }

    entriesToCreate.push({
      workspace_id: workspaceId,
      account_id: account.id,
      reference_id: referenceId,
      debit_amount: posting.debit,
      credit_amount: posting.credit,
      description: posting.description,
    })
  }

  await prisma.ledgerJournalEntry.createMany({
    data: entriesToCreate,
  })
}
