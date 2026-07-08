BEGIN;

ALTER TABLE document.extractions
    ADD COLUMN IF NOT EXISTS coordinate_space text
        CHECK (coordinate_space IS NULL OR coordinate_space IN ('PAGE_NORMALIZED','PAGE_PIXEL','MODEL_LOCAL','IFC'));

ALTER TABLE document.extractions
    ADD COLUMN IF NOT EXISTS geometry_kind text
        CHECK (geometry_kind IS NULL OR geometry_kind IN ('POINT','RECT','POLYGON','POLYLINE'));

ALTER TABLE document.extractions
    ADD COLUMN IF NOT EXISTS normalized_geometry jsonb;

ALTER TABLE document.extractions
    ADD COLUMN IF NOT EXISTS page_width numeric(14,3);

ALTER TABLE document.extractions
    ADD COLUMN IF NOT EXISTS page_height numeric(14,3);

ALTER TABLE document.extractions
    ADD COLUMN IF NOT EXISTS group_key text;

ALTER TABLE document.extractions
    ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE model.spaces
    ADD COLUMN IF NOT EXISTS drawing_geometry jsonb;

ALTER TABLE model.spaces
    ADD COLUMN IF NOT EXISTS source_page integer;

ALTER TABLE document.promotion_runs
    ADD COLUMN IF NOT EXISTS floor_id uuid REFERENCES model.floors(id);

ALTER TABLE document.promotion_runs
    ADD COLUMN IF NOT EXISTS strategy text NOT NULL DEFAULT 'REVIEWED_ROOMS_V1';

CREATE TABLE IF NOT EXISTS document.ai_adapter_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    import_job_id uuid NOT NULL REFERENCES document.import_jobs(id),
    adapter_name text NOT NULL,
    model_name text,
    contract_version text NOT NULL DEFAULT 'DRAWING_ADAPTER/0.4',
    status text NOT NULL DEFAULT 'RUNNING'
        CHECK (status IN ('RUNNING','COMPLETED','FAILED')),
    request_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    response_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    object_count integer NOT NULL DEFAULT 0,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    error_message text
);

CREATE INDEX IF NOT EXISTS idx_extractions_overlay
    ON document.extractions (import_job_id, source_page, review_status);

CREATE INDEX IF NOT EXISTS idx_extractions_normalized_geometry
    ON document.extractions USING gin (normalized_geometry);

CREATE INDEX IF NOT EXISTS idx_ai_adapter_runs_job
    ON document.ai_adapter_runs (import_job_id, started_at DESC);

COMMIT;
