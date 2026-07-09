BEGIN;

GRANT USAGE ON SCHEMA
    workflow,
    bom,
    validation
TO app_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA
    workflow,
    bom,
    validation
TO app_runtime;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA
    workflow,
    bom,
    validation
TO app_runtime;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA
    workflow,
    bom,
    validation
TO app_runtime;

DO $$
DECLARE
    target record;
BEGIN
    FOR target IN
        SELECT DISTINCT c.table_schema, c.table_name
        FROM information_schema.columns c
        JOIN pg_tables t
          ON t.schemaname = c.table_schema
         AND t.tablename = c.table_name
        WHERE c.column_name = 'tenant_id'
          AND c.table_schema IN ('workflow', 'bom', 'validation')
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
            target.table_schema,
            target.table_name
        );

        EXECUTE format(
            'ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',
            target.table_schema,
            target.table_name
        );

        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies p
            WHERE p.schemaname = target.table_schema
              AND p.tablename = target.table_name
              AND p.policyname = 'tenant_isolation'
        ) THEN
            EXECUTE format(
                'CREATE POLICY tenant_isolation ON %I.%I
                 USING (tenant_id = auth.current_tenant_id())
                 WITH CHECK (tenant_id = auth.current_tenant_id())',
                target.table_schema,
                target.table_name
            );
        END IF;
    END LOOP;
END
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA
    workflow,
    bom,
    validation
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA
    workflow,
    bom,
    validation
GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA
    workflow,
    bom,
    validation
GRANT EXECUTE ON FUNCTIONS TO app_runtime;

COMMIT;
