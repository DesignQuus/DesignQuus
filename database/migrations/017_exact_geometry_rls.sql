BEGIN;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'cad'
          AND tablename IN (
              'unit_resolution_runs',
              'unit_resolution_candidates',
              'space_promotion_runs',
              'space_promotion_items'
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

COMMIT;
