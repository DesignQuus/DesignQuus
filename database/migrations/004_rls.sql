BEGIN;

CREATE OR REPLACE FUNCTION auth.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname IN (
            'project', 'document', 'model', 'compliance',
            'calculation', 'approval', 'ops', 'audit'
        )
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
            r.schemaname, r.tablename
        );

        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I.%I
             USING (tenant_id = auth.current_tenant_id())
             WITH CHECK (tenant_id = auth.current_tenant_id())',
            r.schemaname, r.tablename
        );
    END LOOP;
END $$;

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON auth.users
USING (tenant_id = auth.current_tenant_id())
WITH CHECK (tenant_id = auth.current_tenant_id());

COMMIT;
