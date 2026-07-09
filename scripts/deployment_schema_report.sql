\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

SELECT jsonb_build_object(
    'migrationCount', (
        SELECT count(*) FROM public.schema_migrations
    ),
    'latestMigration', (
        SELECT migration_name
        FROM public.schema_migrations
        ORDER BY applied_at DESC, migration_name DESC
        LIMIT 1
    ),
    'runtimeDomainCompletionApplied', EXISTS (
        SELECT 1
        FROM public.schema_migrations
        WHERE migration_name = '026_runtime_role_domain_completion.sql'
    ),
    'workflowTableExists', to_regclass('workflow.erv_design_runs') IS NOT NULL,
    'reliabilityTableExists', to_regclass('ops.idempotency_records') IS NOT NULL,
    'postgisVersion', postgis_lib_version()
)::text;
