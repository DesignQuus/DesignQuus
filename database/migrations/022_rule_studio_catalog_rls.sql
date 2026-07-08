BEGIN;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE (
            schemaname = 'compliance'
            AND tablename IN (
                'rule_drafts','rule_test_suites','rule_test_cases',
                'rule_test_runs','rule_test_results',
                'project_applicability_runs','project_applicability_items'
            )
        ) OR (
            schemaname = 'catalog'
            AND tablename IN (
                'catalog_import_runs','catalog_import_rows',
                'catalog_field_mappings'
            )
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
