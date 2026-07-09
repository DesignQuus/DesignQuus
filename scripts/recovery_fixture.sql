\set ON_ERROR_STOP on

DELETE FROM ops.dead_letter_jobs
WHERE tenant_id = '80000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM ops.outbox_events
WHERE tenant_id = '80000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM ops.idempotency_records
WHERE tenant_id = '80000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM ops.retry_policies
WHERE tenant_id = '80000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM project.projects
WHERE tenant_id = '80000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM auth.tenants
WHERE id = '80000000-0000-7000-8000-000000000000'::uuid;

INSERT INTO auth.tenants (
    id,
    tenant_code,
    name
)
VALUES (
    '80000000-0000-7000-8000-000000000000',
    'RECOVERY-CERT',
    'Recovery Certification Tenant'
);

INSERT INTO project.projects (
    id,
    tenant_id,
    project_code,
    project_name,
    project_type
)
VALUES (
    '80000000-0000-7000-8000-000000000001',
    '80000000-0000-7000-8000-000000000000',
    'RECOVERY-PROJECT-001',
    'Recovery Certification Project',
    'CERTIFICATION'
);

INSERT INTO ops.retry_policies (
    id,
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
    '80000000-0000-7000-8000-000000000010',
    '80000000-0000-7000-8000-000000000000',
    'RECOVERY_RETRY',
    1,
    4,
    250,
    4000,
    2.0,
    0.125
);

INSERT INTO ops.idempotency_records (
    id,
    tenant_id,
    scope,
    idempotency_key,
    request_fingerprint,
    state,
    response_status,
    response_body,
    expires_at,
    completed_at
)
VALUES (
    '80000000-0000-7000-8000-000000000020',
    '80000000-0000-7000-8000-000000000000',
    'RECOVERY_CERTIFICATION',
    'recovery-idempotency-001',
    'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'COMPLETED',
    202,
    '{"accepted":true,"source":"recovery-fixture"}'::jsonb,
    now() + interval '7 days',
    now()
);

INSERT INTO ops.outbox_events (
    id,
    tenant_id,
    aggregate_type,
    aggregate_id,
    event_type,
    event_version,
    payload,
    state,
    retry_policy_key,
    attempt_count,
    next_attempt_at
)
VALUES
    (
        '80000000-0000-7000-8000-000000000030',
        '80000000-0000-7000-8000-000000000000',
        'PROJECT',
        '80000000-0000-7000-8000-000000000001',
        'PROJECT.RECOVERY_SNAPSHOT',
        1,
        '{"sequence":1,"status":"pending"}'::jsonb,
        'PENDING',
        'RECOVERY_RETRY',
        0,
        now()
    ),
    (
        '80000000-0000-7000-8000-000000000031',
        '80000000-0000-7000-8000-000000000000',
        'PROJECT',
        '80000000-0000-7000-8000-000000000001',
        'PROJECT.RECOVERY_PUBLISHED',
        1,
        '{"sequence":2,"status":"published"}'::jsonb,
        'PUBLISHED',
        'RECOVERY_RETRY',
        1,
        now(),
        now()
    );

INSERT INTO ops.dead_letter_jobs (
    id,
    tenant_id,
    source_queue,
    source_job_id,
    job_type,
    payload,
    failure_reason,
    failure_count
)
VALUES (
    '80000000-0000-7000-8000-000000000040',
    '80000000-0000-7000-8000-000000000000',
    'OUTBOX',
    '80000000-0000-7000-8000-000000000099',
    'PROJECT.RECOVERY_FAILED',
    '{"sequence":3,"status":"dead-letter"}'::jsonb,
    'Recovery certification terminal failure',
    4
);

SELECT 'RECOVERY_FIXTURE_READY' AS result;
