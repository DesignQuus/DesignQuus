\set ON_ERROR_STOP on

DELETE FROM ops.dead_letter_jobs
WHERE tenant_id IN (
    '40000000-0000-7000-8000-000000000000'::uuid,
    '50000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM ops.outbox_events
WHERE tenant_id IN (
    '40000000-0000-7000-8000-000000000000'::uuid,
    '50000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM ops.idempotency_records
WHERE tenant_id IN (
    '40000000-0000-7000-8000-000000000000'::uuid,
    '50000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM ops.retry_policies
WHERE tenant_id IN (
    '40000000-0000-7000-8000-000000000000'::uuid,
    '50000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM auth.tenants
WHERE id IN (
    '40000000-0000-7000-8000-000000000000'::uuid,
    '50000000-0000-7000-8000-000000000000'::uuid
);

INSERT INTO auth.tenants (id, tenant_code, name)
VALUES
    ('40000000-0000-7000-8000-000000000000', 'REL-CERT-A', 'Reliability Certification Tenant A'),
    ('50000000-0000-7000-8000-000000000000', 'REL-CERT-B', 'Reliability Certification Tenant B');

BEGIN;
SET LOCAL ROLE app_runtime;
SELECT set_config(
    'app.tenant_id',
    '40000000-0000-7000-8000-000000000000',
    true
);

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
    '40000000-0000-7000-8000-000000000000',
    'OUTBOX_DEFAULT',
    1,
    3,
    100,
    5000,
    2.0,
    0.0
);

DO $$
DECLARE
    first_is_new boolean;
    second_is_new boolean;
BEGIN
    SELECT is_new
      INTO first_is_new
      FROM ops.reserve_idempotency(
          '40000000-0000-7000-8000-000000000000',
          'DOCUMENT_UPLOAD',
          'idem-cert-001',
          'sha256:request-a',
          now() + interval '1 hour'
      );

    IF first_is_new IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'IDEMPOTENCY_FIRST_RESERVATION_NOT_NEW';
    END IF;

    SELECT is_new
      INTO second_is_new
      FROM ops.reserve_idempotency(
          '40000000-0000-7000-8000-000000000000',
          'DOCUMENT_UPLOAD',
          'idem-cert-001',
          'sha256:request-a',
          now() + interval '1 hour'
      );

    IF second_is_new IS DISTINCT FROM false THEN
        RAISE EXCEPTION 'IDEMPOTENCY_REUSE_NOT_DETECTED';
    END IF;

    BEGIN
        PERFORM *
          FROM ops.reserve_idempotency(
              '40000000-0000-7000-8000-000000000000',
              'DOCUMENT_UPLOAD',
              'idem-cert-001',
              'sha256:different-request',
              now() + interval '1 hour'
          );
        RAISE EXCEPTION 'IDEMPOTENCY_FINGERPRINT_CONFLICT_NOT_BLOCKED';
    EXCEPTION
        WHEN invalid_parameter_value THEN
            NULL;
    END;
END
$$;

DO $$
DECLARE
    event_one uuid;
    event_two uuid;
    expired_lease_event uuid;
    claimed_one uuid;
    claimed_two uuid;
    reclaimed_lease uuid;
    transition text;
    dead_letter_id uuid;
    replay_event_id uuid;
BEGIN
    INSERT INTO ops.outbox_events (
        tenant_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload,
        retry_policy_key
    )
    VALUES (
        '40000000-0000-7000-8000-000000000000',
        'PROJECT',
        '40000000-0000-7000-8000-000000000101',
        'PROJECT.UPDATED',
        '{"sequence":1}'::jsonb,
        'OUTBOX_DEFAULT'
    )
    RETURNING id INTO event_one;

    INSERT INTO ops.outbox_events (
        tenant_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload,
        retry_policy_key
    )
    VALUES (
        '40000000-0000-7000-8000-000000000000',
        'PROJECT',
        '40000000-0000-7000-8000-000000000102',
        'PROJECT.UPDATED',
        '{"sequence":2}'::jsonb,
        'OUTBOX_DEFAULT'
    )
    RETURNING id INTO event_two;

    SELECT id
      INTO claimed_one
      FROM ops.claim_outbox_events('worker-one', 1, 60);

    SELECT id
      INTO claimed_two
      FROM ops.claim_outbox_events('worker-two', 1, 60);

    IF claimed_one IS NULL OR claimed_two IS NULL OR claimed_one = claimed_two THEN
        RAISE EXCEPTION 'OUTBOX_DISTINCT_CLAIM_FAILED';
    END IF;

    SELECT ops.fail_outbox_event(
        claimed_one,
        'transient failure',
        0,
        3
    ) INTO transition;

    IF transition <> 'RETRY_SCHEDULED' THEN
        RAISE EXCEPTION 'OUTBOX_RETRY_NOT_SCHEDULED';
    END IF;

    SELECT id
      INTO claimed_one
      FROM ops.claim_outbox_events('worker-three', 1, 60);

    SELECT ops.fail_outbox_event(
        claimed_one,
        'terminal failure',
        0,
        2
    ) INTO transition;

    IF transition <> 'DEAD_LETTER' THEN
        RAISE EXCEPTION 'OUTBOX_DEAD_LETTER_TRANSITION_FAILED';
    END IF;

    SELECT id
      INTO dead_letter_id
      FROM ops.dead_letter_jobs
     WHERE source_job_id = claimed_one
       AND replay_state = 'PENDING';

    IF dead_letter_id IS NULL THEN
        RAISE EXCEPTION 'DEAD_LETTER_RECORD_MISSING';
    END IF;

    SELECT ops.replay_dead_letter(
        dead_letter_id,
        'reliability-certifier'
    ) INTO replay_event_id;

    IF replay_event_id IS NULL THEN
        RAISE EXCEPTION 'DEAD_LETTER_REPLAY_EVENT_MISSING';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM ops.dead_letter_jobs
         WHERE id = dead_letter_id
           AND replay_state = 'REPLAYED'
           AND replayed_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'DEAD_LETTER_REPLAY_STATE_FAILED';
    END IF;

    UPDATE ops.outbox_events
       SET state = 'PUBLISHED',
           published_at = now(),
           locked_at = NULL,
           locked_by = NULL,
           lease_expires_at = NULL
     WHERE id IN (claimed_two, replay_event_id);

    INSERT INTO ops.outbox_events (
        tenant_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload,
        state,
        locked_at,
        locked_by,
        lease_expires_at
    )
    VALUES (
        '40000000-0000-7000-8000-000000000000',
        'PROJECT',
        '40000000-0000-7000-8000-000000000103',
        'PROJECT.LEASE_RECOVERY',
        '{"lease":"expired"}'::jsonb,
        'PUBLISHING',
        now() - interval '2 minutes',
        'stale-worker',
        now() - interval '1 minute'
    )
    RETURNING id INTO expired_lease_event;

    SELECT id
      INTO reclaimed_lease
      FROM ops.claim_outbox_events('lease-recovery-worker', 1, 60);

    IF reclaimed_lease IS DISTINCT FROM expired_lease_event THEN
        RAISE EXCEPTION 'EXPIRED_OUTBOX_LEASE_NOT_RECLAIMED';
    END IF;
END
$$;

COMMIT;

BEGIN;
SET LOCAL ROLE app_runtime;
SELECT set_config(
    'app.tenant_id',
    '50000000-0000-7000-8000-000000000000',
    true
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM ops.retry_policies) THEN
        RAISE EXCEPTION 'TENANT_B_CAN_READ_TENANT_A_RETRY_POLICY';
    END IF;

    IF EXISTS (SELECT 1 FROM ops.idempotency_records) THEN
        RAISE EXCEPTION 'TENANT_B_CAN_READ_TENANT_A_IDEMPOTENCY';
    END IF;

    IF EXISTS (SELECT 1 FROM ops.outbox_events) THEN
        RAISE EXCEPTION 'TENANT_B_CAN_READ_TENANT_A_OUTBOX';
    END IF;

    IF EXISTS (SELECT 1 FROM ops.dead_letter_jobs) THEN
        RAISE EXCEPTION 'TENANT_B_CAN_READ_TENANT_A_DEAD_LETTER';
    END IF;
END
$$;
ROLLBACK;

DELETE FROM ops.dead_letter_jobs
WHERE tenant_id IN (
    '40000000-0000-7000-8000-000000000000'::uuid,
    '50000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM ops.outbox_events
WHERE tenant_id IN (
    '40000000-0000-7000-8000-000000000000'::uuid,
    '50000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM ops.idempotency_records
WHERE tenant_id IN (
    '40000000-0000-7000-8000-000000000000'::uuid,
    '50000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM ops.retry_policies
WHERE tenant_id IN (
    '40000000-0000-7000-8000-000000000000'::uuid,
    '50000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM auth.tenants
WHERE id IN (
    '40000000-0000-7000-8000-000000000000'::uuid,
    '50000000-0000-7000-8000-000000000000'::uuid
);

SELECT 'RELIABILITY_RECOVERY_CERTIFIED' AS result;
