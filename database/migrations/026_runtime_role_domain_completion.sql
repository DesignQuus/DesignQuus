BEGIN;

DO $$
DECLARE
    target_schema text;
BEGIN
    FOREACH target_schema IN ARRAY ARRAY['workflow', 'bom', 'validation']
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_namespace
            WHERE nspname = target_schema
        ) THEN
            EXECUTE format(
                'GRANT USAGE ON SCHEMA %I TO app_runtime',
                target_schema
            );
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO app_runtime',
                target_schema
            );
            EXECUTE format(
                'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO app_runtime',
                target_schema
            );
            EXECUTE format(
                'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO app_runtime',
                target_schema
            );
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime',
                target_schema
            );
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO app_runtime',
                target_schema
            );
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT EXECUTE ON FUNCTIONS TO app_runtime',
                target_schema
            );
        END IF;
    END LOOP;
END
$$;

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

COMMIT;
