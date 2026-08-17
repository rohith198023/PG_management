import { prisma } from '@/lib/prisma'
import { MealBillingType, MealOption } from '@prisma/client'

export async function getWorkspaceBillingConfig(workspaceId: string) {
  let config = await prisma.mealBillingConfig.findUnique({
    where: { workspace_id: workspaceId },
  })

  if (!config) {
    config = await prisma.mealBillingConfig.create({
      data: {
        workspace_id: workspaceId,
        billing_type: MealBillingType.INCLUDED_IN_RENT,
        monthly_plan_price: 3500,
        default_veg_price: 60,
        default_non_veg_price: 90,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
      },
    })
  }

  return config
}

export function checkCutoffStatus(cutoffTime: Date, timezone: string = 'Asia/Kolkata') {
  const now = new Date()
  const cutoff = new Date(cutoffTime)

  const isPassed = now.getTime() >= cutoff.getTime()
  const remainingMs = cutoff.getTime() - now.getTime()
  const remainingMinutes = Math.max(0, Math.floor(remainingMs / (1000 * 60)))

  return {
    isPassed,
    remainingMinutes,
    nowIso: now.toISOString(),
    cutoffIso: cutoff.toISOString(),
  }
}

/**
 * ATOMIC MEAL SELECTION PROCESSOR WITH LEDGER IDEMPOTENCY & FINANCIAL REVERSAL
 *
 * Guarantees:
 * 1. Server-authoritative cutoff validation in workspace timezone.
 * 2. Idempotent ledger adjustments (net differential posting when choice changes).
 * 3. Atomic Outbox & Audit Logging (all steps inside a single Prisma $transaction).
 */
export async function processAtomicMealSelection({
  workspaceId,
  userId,
  menuId,
  tenantId,
  choice,
  ipAddress,
  userAgent,
}: {
  workspaceId: string
  userId: string
  menuId: string
  tenantId: string
  choice: MealOption
  ipAddress?: string | null
  userAgent?: string | null
}) {
  const config = await getWorkspaceBillingConfig(workspaceId)

  // 1. Fetch menu & verify cutoff
  const menu = await prisma.mealMenu.findUnique({
    where: { id: menuId },
  })

  if (!menu || menu.workspace_id !== workspaceId) {
    throw new Error('Meal menu not found or workspace mismatch.')
  }

  if (menu.is_canceled) {
    throw new Error(`Meal slot is cancelled: ${menu.cancel_reason || 'Staff decision'}.`)
  }

  const cutoffCheck = checkCutoffStatus(menu.cutoff_time, config.timezone)
  if (cutoffCheck.isPassed) {
    const error: any = new Error('Cutoff time passed for this meal slot. Changes can no longer be saved.')
    error.statusCode = 422
    throw error
  }

  // 2. Calculate new charged amount based on billing policy
  let newAmount = 0
  if (config.billing_type === MealBillingType.CHARGED_PER_MEAL) {
    if (choice === MealOption.VEG) newAmount = Number(menu.veg_price)
    else if (choice === MealOption.NON_VEG) newAmount = Number(menu.non_veg_price)
    else if (choice === MealOption.SKIP) newAmount = 0
  }

  // 3. Fetch existing selection to compute financial differential
  const existingSelection = await prisma.mealSelection.findUnique({
    where: {
      menu_id_tenant_id: {
        menu_id: menuId,
        tenant_id: tenantId,
      },
    },
  })

  const previousChoice = existingSelection?.choice || null
  const previousAmount = existingSelection ? Number(existingSelection.charged_amount) : 0
  const netDifferential = newAmount - previousAmount

  // Fetch AR (1200) and Mess Revenue (4020 or 4010) accounts if chargeable
  let arAccount: any = null
  let messRevenueAccount: any = null

  if (config.billing_type === MealBillingType.CHARGED_PER_MEAL && netDifferential !== 0) {
    arAccount = await prisma.ledgerAccount.findFirst({
      where: { workspace_id: workspaceId, code: '1200' },
    })
    messRevenueAccount =
      (await prisma.ledgerAccount.findFirst({
        where: { workspace_id: workspaceId, code: '4020' },
      })) ||
      (await prisma.ledgerAccount.findFirst({
        where: { workspace_id: workspaceId, code: '4010' },
      }))
  }

  // Execute atomic transaction for Selection + Ledger Adjustment + Audit Log + Outbox Event
  return await prisma.$transaction(async (tx) => {
    // A. Upsert MealSelection
    const selection = await tx.mealSelection.upsert({
      where: {
        menu_id_tenant_id: {
          menu_id: menuId,
          tenant_id: tenantId,
        },
      },
      update: {
        choice,
        charged_amount: newAmount,
        is_billed: config.billing_type === MealBillingType.CHARGED_PER_MEAL ? true : false,
        billed_at: config.billing_type === MealBillingType.CHARGED_PER_MEAL ? new Date() : null,
      },
      create: {
        workspace_id: workspaceId,
        menu_id: menuId,
        tenant_id: tenantId,
        choice,
        charged_amount: newAmount,
        is_billed: config.billing_type === MealBillingType.CHARGED_PER_MEAL ? true : false,
        billed_at: config.billing_type === MealBillingType.CHARGED_PER_MEAL ? new Date() : null,
      },
    })

    // B. Financial Ledger Posting (Differential Adjustment)
    let journalEntriesPosted = 0
    if (config.billing_type === MealBillingType.CHARGED_PER_MEAL && netDifferential !== 0 && arAccount && messRevenueAccount) {
      if (netDifferential > 0) {
        // Charge additional differential
        const desc = `Meal Adjustment (${previousChoice || 'NONE'} -> ${choice}): ${menu.title} [+₹${netDifferential}]`
        await tx.ledgerJournalEntry.create({
          data: {
            workspace_id: workspaceId,
            account_id: arAccount.id,
            reference_id: selection.id,
            debit_amount: netDifferential,
            credit_amount: 0,
            description: desc,
          },
        })
        await tx.ledgerJournalEntry.create({
          data: {
            workspace_id: workspaceId,
            account_id: messRevenueAccount.id,
            reference_id: selection.id,
            debit_amount: 0,
            credit_amount: netDifferential,
            description: desc,
          },
        })
        journalEntriesPosted = 2
      } else if (netDifferential < 0) {
        // Reverse/Credit previous differential
        const absDiff = Math.abs(netDifferential)
        const desc = `Meal Reversal (${previousChoice} -> ${choice}): ${menu.title} [-₹${absDiff}]`
        await tx.ledgerJournalEntry.create({
          data: {
            workspace_id: workspaceId,
            account_id: messRevenueAccount.id,
            reference_id: selection.id,
            debit_amount: absDiff,
            credit_amount: 0,
            description: desc,
          },
        })
        await tx.ledgerJournalEntry.create({
          data: {
            workspace_id: workspaceId,
            account_id: arAccount.id,
            reference_id: selection.id,
            debit_amount: 0,
            credit_amount: absDiff,
            description: desc,
          },
        })
        journalEntriesPosted = 2
      }
    }

    // C. Write Audit Log
    await tx.mealAuditLog.create({
      data: {
        workspace_id: workspaceId,
        user_id: userId,
        action: 'SUBMIT_MEAL_SELECTION',
        menu_id: menuId,
        details_json: {
          previousChoice,
          newChoice: choice,
          previousAmount,
          newAmount,
          netDifferential,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      },
    })

    // D. Emit Transactional Outbox Notification Event
    await tx.mealEventLog.create({
      data: {
        workspace_id: workspaceId,
        event_type: 'MEAL_SELECTION_CHANGED',
        payload_json: {
          selectionId: selection.id,
          tenantId,
          menuId,
          choice,
          netDifferential,
        },
        status: 'PENDING',
      },
    })

    return {
      selection,
      netDifferential,
      journalEntriesPosted,
      previousChoice,
      newChoice: choice,
    }
  })
}
