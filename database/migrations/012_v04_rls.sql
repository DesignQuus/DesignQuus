BEGIN;

ALTER TABLE document.ai_adapter_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON document.ai_adapter_runs
USING (tenant_id = auth.current_tenant_id())
WITH CHECK (tenant_id = auth.current_tenant_id());

COMMIT;
