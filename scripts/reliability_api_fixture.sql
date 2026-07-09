\set ON_ERROR_STOP on

DELETE FROM ops.dead_letter_jobs
WHERE tenant_id IN (
    '60000000-0000-7000-8000-000000000000'::uuid,
    '70000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM ops.outbox_events
WHERE tenant_id IN (
    '60000000-0000-7000-8000-000000000000'::uuid,
    '70000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM ops.idempotency_records
WHERE tenant_id IN (
    '60000000-0000-7000-8000-000000000000'::uuid,
    '70000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM ops.retry_policies
WHERE tenant_id IN (
    '60000000-0000-7000-8000-000000000000'::uuid,
    '70000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM auth.tenants
WHERE id IN (
    '60000000-0000-7000-8000-000000000000'::uuid,
    '70000000-0000-7000-8000-000000000000'::uuid
);

INSERT INTO auth.tenants (id, tenant_code, name)
VALUES
    ('60000000-0000-7000-8000-000000000000', 'REL-API-A', 'Reliability API Tenant A'),
    ('70000000-0000-7000-8000-000000000000', 'REL-API-B', 'Reliability API Tenant B');

INSERT INTO ops.retry_policies (
    tenant_id,
    policy_key,
    policy_version,
    max_attempts,
    base_delay_ms,
    max_delay_ms,
    backoff_multiplier,
    jitter_ratio
)
VALUES (
    '60000000-0000-7000-8000-000000000000',
    'OUTBOX_DEFAULT',
    1,
    2,
    1,
    10,
    2.0,
    0.0
);

SELECT 'RELIABILITY_API_FIXTURE_READY' AS result;
