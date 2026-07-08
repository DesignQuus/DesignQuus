BEGIN;

-- 업로드/Job API의 멱등성 및 추적성을 강화한다.
ALTER TABLE document.files
    ADD COLUMN IF NOT EXISTS project_revision_id uuid REFERENCES project.revisions(id);

ALTER TABLE document.files
    ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_files_tenant_idempotency
    ON document.files (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

ALTER TABLE document.import_jobs
    ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_import_jobs_tenant_idempotency
    ON document.import_jobs (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- AI 검토 후 Core Model 승격 이력.
CREATE TABLE IF NOT EXISTS document.promotion_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    import_job_id uuid NOT NULL REFERENCES document.import_jobs(id),
    promotion_type text NOT NULL CHECK (promotion_type IN ('SPACES')),
    status text NOT NULL DEFAULT 'RUNNING'
        CHECK (status IN ('RUNNING','COMPLETED','FAILED')),
    promoted_count integer NOT NULL DEFAULT 0,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS document.promotion_items (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    promotion_run_id uuid NOT NULL REFERENCES document.promotion_runs(id),
    extraction_id uuid NOT NULL REFERENCES document.extractions(id),
    target_type text NOT NULL CHECK (target_type IN ('SPACE')),
    target_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (promotion_run_id, extraction_id)
);

CREATE INDEX IF NOT EXISTS idx_promotion_runs_job
    ON document.promotion_runs (import_job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promotion_items_target
    ON document.promotion_items (target_type, target_id);

COMMIT;
