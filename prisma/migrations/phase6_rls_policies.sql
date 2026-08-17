-- =============================================================================
-- PHASE 6: MULTI-TENANT ROW-LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable Row-Level Security on all Phase 6 Mess & Kitchen Logistics tables
ALTER TABLE "MealBillingConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealWeeklyTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealWeeklyTemplateItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealMenu" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealMenuItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealSelection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealEventLog" ENABLE ROW LEVEL SECURITY;

-- 1. MealBillingConfig Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_meal_billing_config ON "MealBillingConfig";
CREATE POLICY tenant_isolation_meal_billing_config ON "MealBillingConfig"
  FOR ALL
  USING (workspace_id::text = current_setting('app.current_workspace_id', true));

-- 2. MealWeeklyTemplate Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_meal_weekly_template ON "MealWeeklyTemplate";
CREATE POLICY tenant_isolation_meal_weekly_template ON "MealWeeklyTemplate"
  FOR ALL
  USING (workspace_id::text = current_setting('app.current_workspace_id', true));

-- 3. MealWeeklyTemplateItem Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_meal_weekly_template_item ON "MealWeeklyTemplateItem";
CREATE POLICY tenant_isolation_meal_weekly_template_item ON "MealWeeklyTemplateItem"
  FOR ALL
  USING (workspace_id::text = current_setting('app.current_workspace_id', true));

-- 4. MealMenu Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_meal_menu ON "MealMenu";
CREATE POLICY tenant_isolation_meal_menu ON "MealMenu"
  FOR ALL
  USING (workspace_id::text = current_setting('app.current_workspace_id', true));

-- 5. MealMenuItem Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_meal_menu_item ON "MealMenuItem";
CREATE POLICY tenant_isolation_meal_menu_item ON "MealMenuItem"
  FOR ALL
  USING (workspace_id::text = current_setting('app.current_workspace_id', true));

-- 6. MealSelection Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_meal_selection ON "MealSelection";
CREATE POLICY tenant_isolation_meal_selection ON "MealSelection"
  FOR ALL
  USING (workspace_id::text = current_setting('app.current_workspace_id', true));

-- 7. MealAuditLog Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_meal_audit_log ON "MealAuditLog";
CREATE POLICY tenant_isolation_meal_audit_log ON "MealAuditLog"
  FOR ALL
  USING (workspace_id::text = current_setting('app.current_workspace_id', true));

-- 8. MealEventLog Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_meal_event_log ON "MealEventLog";
CREATE POLICY tenant_isolation_meal_event_log ON "MealEventLog"
  FOR ALL
  USING (workspace_id::text = current_setting('app.current_workspace_id', true));
