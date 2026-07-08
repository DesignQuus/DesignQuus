BEGIN;

ALTER TABLE document.promotion_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document.promotion_runs
USING (tenant_id = auth.current_tenant_id())
WITH CHECK (tenant_id = auth.current_tenant_id());

ALTER TABLE document.promotion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document.promotion_items
USING (tenant_id = auth.current_tenant_id())
WITH CHECK (tenant_id = auth.current_tenant_id());

COMMIT;
