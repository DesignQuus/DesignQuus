\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

SELECT jsonb_build_object(
    'tenantId', '90000000-0000-7000-8000-000000000000',
    'ervDesignRunCount', (
        SELECT count(*)
        FROM workflow.erv_design_runs
        WHERE tenant_id = '90000000-0000-7000-8000-000000000000'::uuid
    ),
    'idempotencyRecordCount', (
        SELECT count(*)
        FROM ops.idempotency_records
        WHERE tenant_id = '90000000-0000-7000-8000-000000000000'::uuid
    ),
    'uploadedFileCount', (
        SELECT count(*)
        FROM document.files
        WHERE tenant_id = '90000000-0000-7000-8000-000000000000'::uuid
          AND storage_key <> 'performance/fixture/performance-source.pdf'
    ),
    'extractionCount', (
        SELECT count(*)
        FROM document.extractions
        WHERE tenant_id = '90000000-0000-7000-8000-000000000000'::uuid
    ),
    'databaseStats', (
        SELECT jsonb_build_object(
            'numBackends', numbackends,
            'xactCommit', xact_commit,
            'xactRollback', xact_rollback,
            'blksRead', blks_read,
            'blksHit', blks_hit,
            'tempFiles', temp_files,
            'deadlocks', deadlocks
        )
        FROM pg_stat_database
        WHERE datname = current_database()
    )
)::text;
