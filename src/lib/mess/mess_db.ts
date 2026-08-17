import { prisma } from '@/lib/prisma'
import { DayOfWeek, MealSlotType, MealBillingType } from '@prisma/client'

export async function dbGetMealBillingConfig(workspaceId: string) {
  try {
    if ((prisma as any).mealBillingConfig?.findUnique) {
      let config = await (prisma as any).mealBillingConfig.findUnique({
        where: { workspace_id: workspaceId },
      })
      if (!config) {
        config = await (prisma as any).mealBillingConfig.create({
          data: {
            workspace_id: workspaceId,
            billing_type: 'INCLUDED_IN_RENT',
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
  } catch (e) {
    console.warn('Prisma delegate mealBillingConfig failed, using SQL fallback...', e)
  }

  // SQL Fallback
  const rows: any[] = await prisma.$queryRaw`
    SELECT * FROM "MealBillingConfig" WHERE workspace_id = ${workspaceId}::uuid LIMIT 1;
  `
  if (rows.length > 0) return rows[0]

  const newRows: any[] = await prisma.$queryRaw`
    INSERT INTO "MealBillingConfig" (id, workspace_id, billing_type, monthly_plan_price, default_veg_price, default_non_veg_price, currency, timezone, created_at, updated_at)
    VALUES (gen_random_uuid(), ${workspaceId}::uuid, 'INCLUDED_IN_RENT'::"MealBillingType", 3500, 60, 90, 'INR', 'Asia/Kolkata', NOW(), NOW())
    RETURNING *;
  `
  return newRows[0]
}

export async function dbUpsertMealBillingConfig(
  workspaceId: string,
  billingType: string,
  monthlyPlanPrice: number,
  defaultVegPrice: number,
  defaultNonVegPrice: number,
  timezone: string
) {
  try {
    if ((prisma as any).mealBillingConfig?.upsert) {
      return await (prisma as any).mealBillingConfig.upsert({
        where: { workspace_id: workspaceId },
        update: {
          billing_type: billingType as MealBillingType,
          monthly_plan_price: monthlyPlanPrice,
          default_veg_price: defaultVegPrice,
          default_non_veg_price: defaultNonVegPrice,
          timezone: timezone || 'Asia/Kolkata',
        },
        create: {
          workspace_id: workspaceId,
          billing_type: billingType as MealBillingType,
          monthly_plan_price: monthlyPlanPrice,
          default_veg_price: defaultVegPrice,
          default_non_veg_price: defaultNonVegPrice,
          timezone: timezone || 'Asia/Kolkata',
        },
      })
    }
  } catch (e) {
    console.warn('Prisma delegate mealBillingConfig.upsert failed, using SQL fallback...', e)
  }

  const existing = await dbGetMealBillingConfig(workspaceId)
  const rows: any[] = await prisma.$queryRaw`
    UPDATE "MealBillingConfig"
    SET billing_type = ${billingType}::"MealBillingType",
        monthly_plan_price = ${monthlyPlanPrice},
        default_veg_price = ${defaultVegPrice},
        default_non_veg_price = ${defaultNonVegPrice},
        timezone = ${timezone},
        updated_at = NOW()
    WHERE id = ${existing.id}::uuid
    RETURNING *;
  `
  return rows[0]
}

export async function dbGetWeeklyTemplate(workspaceId: string) {
  try {
    if ((prisma as any).mealWeeklyTemplate?.findFirst) {
      let template = await (prisma as any).mealWeeklyTemplate.findFirst({
        where: { workspace_id: workspaceId, is_active: true },
        include: { items: true },
      })
      if (!template) {
        template = await (prisma as any).mealWeeklyTemplate.create({
          data: {
            workspace_id: workspaceId,
            name: 'Standard Weekly Menu',
            is_active: true,
          },
          include: { items: true },
        })
      }
      return template
    }
  } catch (e) {
    console.warn('Prisma delegate mealWeeklyTemplate failed, using SQL fallback...', e)
  }

  // SQL Fallback
  let rows: any[] = await prisma.$queryRaw`
    SELECT * FROM "MealWeeklyTemplate" WHERE workspace_id = ${workspaceId}::uuid AND is_active = true LIMIT 1;
  `
  let template = rows[0]

  if (!template) {
    const created: any[] = await prisma.$queryRaw`
      INSERT INTO "MealWeeklyTemplate" (id, workspace_id, name, is_active, created_at, updated_at)
      VALUES (gen_random_uuid(), ${workspaceId}::uuid, 'Standard Weekly Menu', true, NOW(), NOW())
      RETURNING *;
    `
    template = created[0]
  }

  const items: any[] = await prisma.$queryRaw`
    SELECT * FROM "MealWeeklyTemplateItem" WHERE template_id = ${template.id}::uuid;
  `

  return { ...template, items }
}

export async function dbUpsertWeeklyTemplateItem({
  workspaceId,
  templateId,
  dayOfWeek,
  slot,
  title,
  description,
  vegAvailable,
  nonVegAvailable,
  vegPrice,
  nonVegPrice,
  isSpecial,
  specialTag,
  items,
}: {
  workspaceId: string
  templateId: string
  dayOfWeek: string
  slot: string
  title: string
  description?: string
  vegAvailable: boolean
  nonVegAvailable: boolean
  vegPrice: number
  nonVegPrice: number
  isSpecial: boolean
  specialTag?: string | null
  items?: any
}) {
  try {
    if ((prisma as any).mealWeeklyTemplateItem?.upsert) {
      return await (prisma as any).mealWeeklyTemplateItem.upsert({
        where: {
          template_id_day_of_week_slot: {
            template_id: templateId,
            day_of_week: dayOfWeek as DayOfWeek,
            slot: slot as MealSlotType,
          },
        },
        update: {
          title,
          description,
          veg_available: vegAvailable,
          non_veg_available: nonVegAvailable,
          veg_price: vegPrice,
          non_veg_price: nonVegPrice,
          is_special: isSpecial,
          special_tag: specialTag,
          items_json: items || [],
        },
        create: {
          workspace_id: workspaceId,
          template_id: templateId,
          day_of_week: dayOfWeek as DayOfWeek,
          slot: slot as MealSlotType,
          title,
          description,
          veg_available: vegAvailable,
          non_veg_available: nonVegAvailable,
          veg_price: vegPrice,
          non_veg_price: nonVegPrice,
          is_special: isSpecial,
          special_tag: specialTag,
          items_json: items || [],
        },
      })
    }
  } catch (e) {
    console.warn('Prisma delegate mealWeeklyTemplateItem.upsert failed, using SQL fallback...', e)
  }

  const itemsJsonStr = JSON.stringify(items || [])
  const rows: any[] = await prisma.$queryRaw`
    INSERT INTO "MealWeeklyTemplateItem" (
      id, workspace_id, template_id, day_of_week, slot, title, description,
      veg_available, non_veg_available, veg_price, non_veg_price, is_special, special_tag, items_json, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), ${workspaceId}::uuid, ${templateId}::uuid, ${dayOfWeek}::"DayOfWeek", ${slot}::"MealSlotType", ${title}, ${description || null},
      ${vegAvailable}, ${nonVegAvailable}, ${vegPrice}, ${nonVegPrice}, ${isSpecial}, ${specialTag || null}, ${itemsJsonStr}::jsonb, NOW(), NOW()
    )
    ON CONFLICT (template_id, day_of_week, slot) DO UPDATE
    SET title = EXCLUDED.title,
        description = EXCLUDED.description,
        veg_available = EXCLUDED.veg_available,
        non_veg_available = EXCLUDED.non_veg_available,
        veg_price = EXCLUDED.veg_price,
        non_veg_price = EXCLUDED.non_veg_price,
        is_special = EXCLUDED.is_special,
        special_tag = EXCLUDED.special_tag,
        items_json = EXCLUDED.items_json,
        updated_at = NOW()
    RETURNING *;
  `
  return rows[0]
}
