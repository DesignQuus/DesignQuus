BEGIN;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE (
            schemaname = 'model'
            AND tablename IN (
                'space_design_profiles',
                'space_profile_evidence'
            )
        ) OR (
            schemaname = 'compliance'
            AND tablename IN (
                'authoritative_sources',
                'ventilation_rule_sets',
                'ventilation_rule_parameters'
            )
        ) OR (
            schemaname = 'workflow'
            AND tablename IN (
                'space_ventilation_runs',
                'space_ventilation_items'
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
