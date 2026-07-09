BEGIN;

DO $$
DECLARE
    target record;
BEGIN
    FOR target IN
        SELECT schemaname, tablename
          FROM pg_tables
         WHERE schemaname = 'ops'
           AND tablename IN (
               'retry_policies',
               'idempotency_records',
               'outbox_events',
               'dead_letter_jobs'
           )
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
            target.schemaname,
            target.tablename
        );

        EXECUTE format(
            'ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',
            target.schemaname,
            target.tablename
        );

        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I.%I
             USING (tenant_id = auth.current_tenant_id())
             WITH CHECK (tenant_id = auth.current_tenant_id())',
            target.schemaname,
            target.tablename
        );
    END LOOP;
END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON
    ops.retry_policies,
    ops.idempotency_records,
    ops.outbox_events,
    ops.dead_letter_jobs
TO app_runtime;

GRANT EXECUTE ON FUNCTION ops.reserve_idempotency(
    uuid, text, text, text, timestamptz
) TO app_runtime;

GRANT EXECUTE ON FUNCTION ops.claim_outbox_events(
    text, integer, integer
) TO app_runtime;

GRANT EXECUTE ON FUNCTION ops.move_outbox_to_dead_letter(
    uuid, text
) TO app_runtime;

GRANT EXECUTE ON FUNCTION ops.fail_outbox_event(
    uuid, text, integer, integer
) TO app_runtime;

GRANT EXECUTE ON FUNCTION ops.replay_dead_letter(
    uuid, text
) TO app_runtime;

COMMIT;
