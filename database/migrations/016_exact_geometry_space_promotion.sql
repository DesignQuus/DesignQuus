BEGIN;

CREATE TABLE cad.unit_resolution_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    cad_import_run_id uuid NOT NULL REFERENCES cad.import_runs(id),
    source_insunits_code integer,
    source_unit_name text,
    resolution_method text NOT NULL CHECK (resolution_method IN (
        'HEADER','INFERENCE','USER_CONFIRMATION'
    )),
    meters_per_unit numeric(30,15),
    confidence_score numeric(6,5)
        CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1),
    status text NOT NULL DEFAULT 'REVIEW_REQUIRED'
        CHECK (status IN ('VALIDATED','REVIEW_REQUIRED','USER_CONFIRMED','REJECTED')),
    evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_by uuid REFERENCES auth.users(id),
    resolved_at timestamptz,
    CHECK (
        meters_per_unit IS NULL OR meters_per_unit > 0
    )
);

CREATE TABLE cad.unit_resolution_candidates (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    unit_resolution_run_id uuid NOT NULL REFERENCES cad.unit_resolution_runs(id) ON DELETE CASCADE,
    unit_code integer NOT NULL,
    unit_name text NOT NULL,
    meters_per_unit numeric(30,15) NOT NULL CHECK (meters_per_unit > 0),
    width_m numeric(24,6),
    height_m numeric(24,6),
    extent_area_m2 numeric(30,6),
    plausibility_score numeric(6,5) NOT NULL CHECK (plausibility_score BETWEEN 0 AND 1),
    rank_no integer NOT NULL CHECK (rank_no > 0),
    evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (unit_resolution_run_id, unit_code)
);

CREATE TABLE cad.space_promotion_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    room_detection_run_id uuid NOT NULL REFERENCES cad.room_detection_runs(id),
    unit_resolution_run_id uuid NOT NULL REFERENCES cad.unit_resolution_runs(id),
    floor_id uuid NOT NULL REFERENCES model.floors(id),
    promotion_policy_version text NOT NULL,
    status text NOT NULL DEFAULT 'PLANNING'
        CHECK (status IN (
            'PLANNING','REVIEW_REQUIRED','READY',
            'RUNNING','COMPLETED','FAILED','CANCELLED'
        )),
    candidate_count integer NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
    promotable_count integer NOT NULL DEFAULT 0 CHECK (promotable_count >= 0),
    promoted_count integer NOT NULL DEFAULT 0 CHECK (promoted_count >= 0),
    policy_snapshot jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    completed_at timestamptz,
    error_message text
);

CREATE TABLE cad.space_promotion_items (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    promotion_run_id uuid NOT NULL REFERENCES cad.space_promotion_runs(id) ON DELETE CASCADE,
    room_candidate_id uuid NOT NULL REFERENCES cad.room_candidates(id),
    target_space_id uuid REFERENCES model.spaces(id),
    proposed_space_code text NOT NULL,
    proposed_space_name text NOT NULL,
    proposed_space_type_code text NOT NULL,
    area_m2 numeric(18,6) NOT NULL CHECK (area_m2 > 0),
    geometry_geojson jsonb NOT NULL,
    geometry_quality_status text NOT NULL CHECK (geometry_quality_status IN (
        'VALID','REPAIRED_SINGLE','REPAIRED_FRAGMENTED','INVALID','EMPTY'
    )),
    decision text NOT NULL CHECK (decision IN (
        'READY','REVIEW_REQUIRED','BLOCKED','PROMOTED','REJECTED'
    )),
    blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
    evidence_json jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    promoted_at timestamptz,
    UNIQUE (promotion_run_id, room_candidate_id)
);

ALTER TABLE cad.import_runs
    ADD COLUMN IF NOT EXISTS source_insunits_code integer;

ALTER TABLE cad.import_runs
    ADD COLUMN IF NOT EXISTS source_unit_name text;

ALTER TABLE cad.import_runs
    ADD COLUMN IF NOT EXISTS meters_per_unit numeric(30,15);

ALTER TABLE cad.import_runs
    ADD COLUMN IF NOT EXISTS unit_resolution_status text
        CHECK (
            unit_resolution_status IS NULL OR
            unit_resolution_status IN (
                'VALIDATED','REVIEW_REQUIRED','USER_CONFIRMED','REJECTED'
            )
        );

ALTER TABLE cad.room_candidates
    ADD COLUMN IF NOT EXISTS unit_resolution_run_id uuid
        REFERENCES cad.unit_resolution_runs(id);

ALTER TABLE cad.room_candidates
    ADD COLUMN IF NOT EXISTS exact_geometry_json jsonb;

ALTER TABLE cad.room_candidates
    ADD COLUMN IF NOT EXISTS model_geometry geometry(Polygon);

ALTER TABLE cad.room_candidates
    ADD COLUMN IF NOT EXISTS area_m2 numeric(18,6);

ALTER TABLE cad.room_candidates
    ADD COLUMN IF NOT EXISTS perimeter_m numeric(18,6);

ALTER TABLE cad.room_candidates
    ADD COLUMN IF NOT EXISTS centroid_m_json jsonb;

ALTER TABLE cad.room_candidates
    ADD COLUMN IF NOT EXISTS geometry_quality_status text
        CHECK (
            geometry_quality_status IS NULL OR
            geometry_quality_status IN (
                'VALID','REPAIRED_SINGLE','REPAIRED_FRAGMENTED','INVALID','EMPTY'
            )
        );

ALTER TABLE cad.room_candidates
    ADD COLUMN IF NOT EXISTS geometry_repair_applied boolean NOT NULL DEFAULT false;

ALTER TABLE cad.room_candidates
    ADD COLUMN IF NOT EXISTS auto_promotable boolean NOT NULL DEFAULT false;

ALTER TABLE cad.ai_cad_match_candidates
    ADD COLUMN IF NOT EXISTS geometry_engine text;

ALTER TABLE cad.ai_cad_match_candidates
    ADD COLUMN IF NOT EXISTS intersection_area numeric(24,12);

ALTER TABLE cad.ai_cad_match_candidates
    ADD COLUMN IF NOT EXISTS union_area numeric(24,12);

ALTER TABLE cad.ai_cad_match_candidates
    ADD COLUMN IF NOT EXISTS geometry_repair_applied boolean NOT NULL DEFAULT false;

ALTER TABLE model.spaces
    ADD COLUMN IF NOT EXISTS cad_room_candidate_id uuid
        REFERENCES cad.room_candidates(id);

ALTER TABLE model.spaces
    ADD COLUMN IF NOT EXISTS geometry_coordinate_space text
        CHECK (
            geometry_coordinate_space IS NULL OR
            geometry_coordinate_space IN ('MODEL_LOCAL_M','IFC')
        );

ALTER TABLE model.spaces
    ADD COLUMN IF NOT EXISTS geometry_source text
        CHECK (
            geometry_source IS NULL OR
            geometry_source IN (
                'CAD_ROOM_CANDIDATE','AI_EXTRACTION','IFC_SPACE','USER_DRAWN'
            )
        );

ALTER TABLE model.spaces
    ADD COLUMN IF NOT EXISTS area_source text
        CHECK (
            area_source IS NULL OR
            area_source IN (
                'EXACT_CAD_GEOMETRY','IFC_QUANTITY','AI_ESTIMATE','USER_INPUT'
            )
        );

ALTER TABLE model.spaces
    ADD COLUMN IF NOT EXISTS geometry_quality_status text
        CHECK (
            geometry_quality_status IS NULL OR
            geometry_quality_status IN (
                'VALID','REPAIRED_SINGLE','REPAIRED_FRAGMENTED','INVALID','EMPTY'
            )
        );

CREATE OR REPLACE FUNCTION cad.exact_iou(a geometry, b geometry)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    WITH valid AS (
        SELECT
            ST_MakeValid(a) AS ga,
            ST_MakeValid(b) AS gb
    ),
    metrics AS (
        SELECT
            ST_Area(ST_Intersection(ga, gb)) AS intersection_area,
            ST_Area(ST_Union(ga, gb)) AS union_area
        FROM valid
    )
    SELECT CASE
        WHEN union_area IS NULL OR union_area = 0 THEN 0.0
        ELSE intersection_area / union_area
    END
    FROM metrics
$$;

CREATE INDEX idx_unit_resolution_run
    ON cad.unit_resolution_runs (cad_import_run_id, created_at DESC);

CREATE INDEX idx_unit_resolution_candidates_rank
    ON cad.unit_resolution_candidates (unit_resolution_run_id, rank_no);

CREATE INDEX idx_room_candidates_area_m2
    ON cad.room_candidates (room_detection_run_id, area_m2);

CREATE INDEX idx_room_candidates_model_geometry
    ON cad.room_candidates USING gist (model_geometry);

CREATE INDEX idx_space_promotion_runs_status
    ON cad.space_promotion_runs (project_revision_id, status, created_at DESC);

CREATE INDEX idx_space_promotion_items_decision
    ON cad.space_promotion_items (promotion_run_id, decision);

COMMIT;
