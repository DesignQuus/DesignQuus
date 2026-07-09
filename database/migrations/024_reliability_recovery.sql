BEGIN;

CREATE TABLE ops.retry_policies (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    policy_key text NOT NULL,
    policy_version integer NOT NULL CHECK (policy_version > 0),
    max_attempts integer NOT NULL CHECK (max_attempts > 0),
    base_delay_ms integer NOT NULL CHECK (base_delay_ms > 0),
    max_delay_ms integer NOT NULL CHECK (max_delay_ms >= base_delay_ms),
    backoff_multiplier numeric(8,4) NOT NULL DEFAULT 2.0
        CHECK (backoff_multiplier >= 1.0),
    jitter_ratio numeric(6,5) NOT NULL DEFAULT 0.0
        CHECK (jitter_ratio >= 0.0 AND jitter_ratio <= 1.0),
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id),
    UNIQUE (tenant_id, policy_key, policy_version)
);

CREATE TABLE ops.idempotency_records (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    scope text NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    state text NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (state IN ('IN_PROGRESS','COMPLETED','FAILED')),
    response_status integer CHECK (
        response_status IS NULL OR response_status BETWEEN 100 AND 599
    ),
    response_body jsonb,
    failure_code text,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE (tenant_id, scope, idempotency_key),
    CHECK (
        (state = 'COMPLETED' AND response_status IS NOT NULL)
        OR state <> 'COMPLETED'
    )
);

CREATE TABLE ops.outbox_events (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type text NOT NULL,
    event_version integer NOT NULL DEFAULT 1 CHECK (event_version > 0),
    payload jsonb NOT NULL,
    state text NOT NULL DEFAULT 'PENDING'
        CHECK (state IN (
            'PENDING','PUBLISHING','PUBLISHED','FAILED','DEAD_LETTER'
        )),
    retry_policy_key text,
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    locked_at timestamptz,
    locked_by text,
    lease_expires_at timestamptz,
    published_at timestamptz,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (state = 'PUBLISHED' AND published_at IS NOT NULL)
        OR state <> 'PUBLISHED'
    )
);

CREATE TABLE ops.dead_letter_jobs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    source_queue text NOT NULL,
    source_job_id uuid NOT NULL,
    job_type text NOT NULL,
    payload jsonb NOT NULL,
    failure_reason text NOT NULL,
    failure_count integer NOT NULL CHECK (failure_count > 0),
    replay_state text NOT NULL DEFAULT 'PENDING'
        CHECK (replay_state IN ('PENDING','REPLAYED','ABANDONED')),
    replayed_at timestamptz,
    replayed_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, source_queue, source_job_id),
    CHECK (
        (replay_state = 'REPLAYED' AND replayed_at IS NOT NULL)
        OR replay_state <> 'REPLAYED'
    )
);

CREATE INDEX idx_retry_policies_lookup
    ON ops.retry_policies (
        tenant_id, policy_key, enabled, policy_version DESC
    );

CREATE INDEX idx_idempotency_records_expiry
    ON ops.idempotency_records (tenant_id, expires_at);

CREATE INDEX idx_outbox_claim
    ON ops.outbox_events (
        tenant_id, state, next_attempt_at, created_at
    )
    WHERE state IN ('PENDING','FAILED');

CREATE INDEX idx_outbox_lease
    ON ops.outbox_events (tenant_id, lease_expires_at)
    WHERE state = 'PUBLISHING';

CREATE INDEX idx_dead_letter_replay
    ON ops.dead_letter_jobs (
        tenant_id, replay_state, created_at
    );

CREATE OR REPLACE FUNCTION ops.reserve_idempotency(
    p_tenant_id uuid,
    p_scope text,
    p_idempotency_key text,
    p_request_fingerprint text,
    p_expires_at timestamptz
)
RETURNS TABLE (
    record_id uuid,
    record_state text,
    is_new boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_record ops.idempotency_records%ROWTYPE;
    v_inserted boolean := false;
BEGIN
    INSERT INTO ops.idempotency_records (
        tenant_id,
        scope,
        idempotency_key,
        request_fingerprint,
        expires_at
    )
    VALUES (
        p_tenant_id,
        p_scope,
        p_idempotency_key,
        p_request_fingerprint,
        p_expires_at
    )
    ON CONFLICT (tenant_id, scope, idempotency_key) DO NOTHING
    RETURNING * INTO v_record;

    IF FOUND THEN
        v_inserted := true;
    ELSE
        SELECT *
          INTO v_record
          FROM ops.idempotency_records
         WHERE tenant_id = p_tenant_id
           AND scope = p_scope
           AND idempotency_key = p_idempotency_key;
    END IF;

    IF v_record.request_fingerprint <> p_request_fingerprint THEN
        RAISE EXCEPTION 'IDEMPOTENCY_FINGERPRINT_CONFLICT'
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT v_record.id, v_record.state, v_inserted;
END
$$;

CREATE OR REPLACE FUNCTION ops.claim_outbox_events(
    p_worker_id text,
    p_limit integer DEFAULT 10,
    p_lease_seconds integer DEFAULT 60
)
RETURNS SETOF ops.outbox_events
LANGUAGE sql
AS $$
    WITH candidates AS (
        SELECT id
          FROM ops.outbox_events
         WHERE state IN ('PENDING','FAILED')
           AND next_attempt_at <= now()
           AND (
               lease_expires_at IS NULL
               OR lease_expires_at <= now()
           )
         ORDER BY created_at, id
         FOR UPDATE SKIP LOCKED
         LIMIT GREATEST(1, LEAST(p_limit, 100))
    ), claimed AS (
        UPDATE ops.outbox_events o
           SET state = 'PUBLISHING',
               attempt_count = o.attempt_count + 1,
               locked_at = now(),
               locked_by = p_worker_id,
               lease_expires_at = now()
                   + make_interval(secs => GREATEST(1, p_lease_seconds)),
               updated_at = now()
          FROM candidates c
         WHERE o.id = c.id
        RETURNING o.*
    )
    SELECT * FROM claimed
$$;

CREATE OR REPLACE FUNCTION ops.move_outbox_to_dead_letter(
    p_event_id uuid,
    p_failure_reason text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_event ops.outbox_events%ROWTYPE;
    v_dead_letter_id uuid;
BEGIN
    UPDATE ops.outbox_events
       SET state = 'DEAD_LETTER',
           last_error = p_failure_reason,
           locked_at = NULL,
           locked_by = NULL,
           lease_expires_at = NULL,
           updated_at = now()
     WHERE id = p_event_id
    RETURNING * INTO v_event;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'OUTBOX_EVENT_NOT_FOUND'
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO ops.dead_letter_jobs (
        tenant_id,
        source_queue,
        source_job_id,
        job_type,
        payload,
        failure_reason,
        failure_count
    )
    VALUES (
        v_event.tenant_id,
        'OUTBOX',
        v_event.id,
        v_event.event_type,
        v_event.payload,
        p_failure_reason,
        GREATEST(1, v_event.attempt_count)
    )
    ON CONFLICT (tenant_id, source_queue, source_job_id)
    DO UPDATE SET
        failure_reason = EXCLUDED.failure_reason,
        failure_count = GREATEST(
            ops.dead_letter_jobs.failure_count,
            EXCLUDED.failure_count
        )
    RETURNING id INTO v_dead_letter_id;

    RETURN v_dead_letter_id;
END
$$;

CREATE OR REPLACE FUNCTION ops.replay_dead_letter(
    p_dead_letter_id uuid,
    p_replayed_by text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_dead_letter ops.dead_letter_jobs%ROWTYPE;
    v_new_event_id uuid;
BEGIN
    SELECT *
      INTO v_dead_letter
      FROM ops.dead_letter_jobs
     WHERE id = p_dead_letter_id
       AND replay_state = 'PENDING'
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'DEAD_LETTER_NOT_REPLAYABLE'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO ops.outbox_events (
        tenant_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload
    )
    VALUES (
        v_dead_letter.tenant_id,
        'DEAD_LETTER_REPLAY',
        v_dead_letter.source_job_id,
        v_dead_letter.job_type,
        v_dead_letter.payload
    )
    RETURNING id INTO v_new_event_id;

    UPDATE ops.dead_letter_jobs
       SET replay_state = 'REPLAYED',
           replayed_at = now(),
           replayed_by = p_replayed_by
     WHERE id = p_dead_letter_id;

    RETURN v_new_event_id;
END
$$;

COMMIT;
