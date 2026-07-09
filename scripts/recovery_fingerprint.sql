\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

WITH target AS (
    SELECT '80000000-0000-7000-8000-000000000000'::uuid AS tenant_id
)
SELECT jsonb_build_object(
    'tenant_count', (
        SELECT count(*)
        FROM auth.tenants t, target x
        WHERE t.id = x.tenant_id
    ),
    'tenant_checksum', (
        SELECT md5(coalesce(string_agg(
            concat_ws('|', t.id::text, t.tenant_code, t.name),
            '||' ORDER BY t.id
        ), ''))
        FROM auth.tenants t, target x
        WHERE t.id = x.tenant_id
    ),
    'project_count', (
        SELECT count(*)
        FROM project.projects p, target x
        WHERE p.tenant_id = x.tenant_id
    ),
    'project_checksum', (
        SELECT md5(coalesce(string_agg(
            concat_ws('|',
                p.id::text,
                p.project_code,
                p.project_name,
                p.project_type
            ),
            '||' ORDER BY p.id
        ), ''))
        FROM project.projects p, target x
        WHERE p.tenant_id = x.tenant_id
    ),
    'retry_policy_count', (
        SELECT count(*)
        FROM ops.retry_policies r, target x
        WHERE r.tenant_id = x.tenant_id
    ),
    'retry_policy_checksum', (
        SELECT md5(coalesce(string_agg(
            concat_ws('|',
                r.id::text,
                r.policy_key,
                r.policy_version::text,
                r.max_attempts::text,
                r.base_delay_ms::text,
                r.max_delay_ms::text,
                r.backoff_multiplier::text,
                r.jitter_ratio::text,
                r.enabled::text
            ),
            '||' ORDER BY r.id
        ), ''))
        FROM ops.retry_policies r, target x
        WHERE r.tenant_id = x.tenant_id
    ),
    'idempotency_count', (
        SELECT count(*)
        FROM ops.idempotency_records i, target x
        WHERE i.tenant_id = x.tenant_id
    ),
    'idempotency_checksum', (
        SELECT md5(coalesce(string_agg(
            concat_ws('|',
                i.id::text,
                i.scope,
                i.idempotency_key,
                i.request_fingerprint,
                i.state,
                coalesce(i.response_status::text, ''),
                coalesce(i.response_body::text, ''),
                coalesce(i.failure_code, '')
            ),
            '||' ORDER BY i.id
        ), ''))
        FROM ops.idempotency_records i, target x
        WHERE i.tenant_id = x.tenant_id
    ),
    'outbox_count', (
        SELECT count(*)
        FROM ops.outbox_events o, target x
        WHERE o.tenant_id = x.tenant_id
    ),
    'outbox_checksum', (
        SELECT md5(coalesce(string_agg(
            concat_ws('|',
                o.id::text,
                o.aggregate_type,
                o.aggregate_id::text,
                o.event_type,
                o.event_version::text,
                o.payload::text,
                o.state,
                coalesce(o.retry_policy_key, ''),
                o.attempt_count::text
            ),
            '||' ORDER BY o.id
        ), ''))
        FROM ops.outbox_events o, target x
        WHERE o.tenant_id = x.tenant_id
    ),
    'dead_letter_count', (
        SELECT count(*)
        FROM ops.dead_letter_jobs d, target x
        WHERE d.tenant_id = x.tenant_id
    ),
    'dead_letter_checksum', (
        SELECT md5(coalesce(string_agg(
            concat_ws('|',
                d.id::text,
                d.source_queue,
                d.source_job_id::text,
                d.job_type,
                d.payload::text,
                d.failure_reason,
                d.failure_count::text,
                d.replay_state
            ),
            '||' ORDER BY d.id
        ), ''))
        FROM ops.dead_letter_jobs d, target x
        WHERE d.tenant_id = x.tenant_id
    ),
    'application_table_count', (
        SELECT count(*)
        FROM pg_tables
        WHERE schemaname IN (
            'auth','project','document','model','compliance',
            'calculation','approval','ops','audit','cad','catalog','workflow'
        )
    ),
    'postgis_area_probe', (
        SELECT ST_Area(
            ST_GeomFromText('POLYGON((0 0,10 0,10 5,0 5,0 0))')
        )
    )
)::text;
