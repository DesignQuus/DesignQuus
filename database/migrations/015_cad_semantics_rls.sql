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
            'layer_classification_runs','layer_classifications',
            'room_detection_runs','room_candidates','text_room_matches',
            'ai_cad_match_runs','ai_cad_match_candidates'
          )
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I.%I USING (tenant_id = auth.current_tenant_id()) WITH CHECK (tenant_id = auth.current_tenant_id())',
            r.schemaname, r.tablename
        );
    END LOOP;
END $$;

COMMIT;
