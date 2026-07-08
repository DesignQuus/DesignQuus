BEGIN;

CREATE TABLE cad.layer_classification_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    cad_import_run_id uuid NOT NULL REFERENCES cad.import_runs(id),
    classifier_version text NOT NULL,
    policy_snapshot jsonb NOT NULL,
    status text NOT NULL DEFAULT 'RUNNING'
        CHECK (status IN ('RUNNING','COMPLETED','FAILED','CANCELLED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    error_message text
);

CREATE TABLE cad.layer_classifications (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    classification_run_id uuid NOT NULL REFERENCES cad.layer_classification_runs(id),
    layer_name text NOT NULL,
    category text NOT NULL CHECK (category IN (
        'ROOM_BOUNDARY','ROOM_TEXT','WALL','DOOR','WINDOW',
        'HVAC_EQUIPMENT','DUCT','PIPE','ANNOTATION','IGNORE','UNKNOWN'
    )),
    confidence_score numeric(6,5) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    score_breakdown jsonb NOT NULL,
    matched_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
    object_count integer NOT NULL DEFAULT 0 CHECK (object_count >= 0),
    entity_histogram jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (classification_run_id, layer_name)
);

CREATE TABLE cad.room_detection_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    cad_import_run_id uuid NOT NULL REFERENCES cad.import_runs(id),
    layer_classification_run_id uuid REFERENCES cad.layer_classification_runs(id),
    detector_version text NOT NULL,
    policy_snapshot jsonb NOT NULL,
    status text NOT NULL DEFAULT 'RUNNING'
        CHECK (status IN ('RUNNING','COMPLETED','REVIEW_REQUIRED','FAILED','CANCELLED')),
    candidate_count integer NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    error_message text
);

CREATE TABLE cad.room_candidates (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    room_detection_run_id uuid NOT NULL REFERENCES cad.room_detection_runs(id),
    cad_object_id uuid NOT NULL REFERENCES cad.objects(id),
    layer_name text NOT NULL,
    layer_category text,
    polygon_json jsonb NOT NULL,
    area_cad_units2 numeric(24,8) NOT NULL CHECK (area_cad_units2 > 0),
    centroid_json jsonb NOT NULL,
    bbox_json jsonb NOT NULL,
    geometry_valid boolean NOT NULL,
    self_intersecting boolean NOT NULL DEFAULT false,
    candidate_score numeric(6,5) NOT NULL CHECK (candidate_score BETWEEN 0 AND 1),
    score_breakdown jsonb NOT NULL,
    status text NOT NULL DEFAULT 'CANDIDATE'
        CHECK (status IN ('CANDIDATE','ACCEPTED','REJECTED','PROMOTED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (room_detection_run_id, cad_object_id)
);

CREATE TABLE cad.text_room_matches (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    room_candidate_id uuid NOT NULL REFERENCES cad.room_candidates(id),
    text_cad_object_id uuid NOT NULL REFERENCES cad.objects(id),
    match_method text NOT NULL CHECK (match_method IN ('INSIDE','NEAREST','USER_MATCH')),
    distance_to_centroid numeric(24,8),
    text_value text NOT NULL,
    normalized_text text NOT NULL,
    confidence_score numeric(6,5) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    selected_as_room_name boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (room_candidate_id, text_cad_object_id)
);

CREATE TABLE cad.ai_cad_match_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    import_job_id uuid NOT NULL REFERENCES document.import_jobs(id),
    room_detection_run_id uuid NOT NULL REFERENCES cad.room_detection_runs(id),
    calibration_id uuid NOT NULL REFERENCES cad.transform_calibrations(id),
    matcher_version text NOT NULL,
    policy_snapshot jsonb NOT NULL,
    status text NOT NULL DEFAULT 'RUNNING'
        CHECK (status IN ('RUNNING','COMPLETED','REVIEW_REQUIRED','FAILED','CANCELLED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    error_message text
);

CREATE TABLE cad.ai_cad_match_candidates (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    match_run_id uuid NOT NULL REFERENCES cad.ai_cad_match_runs(id),
    extraction_id uuid NOT NULL REFERENCES document.extractions(id),
    room_candidate_id uuid NOT NULL REFERENCES cad.room_candidates(id),
    geometry_iou numeric(6,5) NOT NULL CHECK (geometry_iou BETWEEN 0 AND 1),
    centroid_score numeric(6,5) NOT NULL CHECK (centroid_score BETWEEN 0 AND 1),
    area_score numeric(6,5) NOT NULL CHECK (area_score BETWEEN 0 AND 1),
    text_score numeric(6,5) NOT NULL CHECK (text_score BETWEEN 0 AND 1),
    layer_score numeric(6,5) NOT NULL CHECK (layer_score BETWEEN 0 AND 1),
    total_score numeric(6,5) NOT NULL CHECK (total_score BETWEEN 0 AND 1),
    rank_no integer NOT NULL CHECK (rank_no > 0),
    gap_to_second numeric(6,5),
    decision text NOT NULL CHECK (decision IN ('AUTO_MATCH','REVIEW_REQUIRED','REJECTED')),
    evidence_json jsonb NOT NULL,
    selected boolean NOT NULL DEFAULT false,
    selected_by uuid REFERENCES auth.users(id),
    selected_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (match_run_id, extraction_id, room_candidate_id)
);

CREATE INDEX idx_layer_classification_run ON cad.layer_classifications (classification_run_id, category);
CREATE INDEX idx_room_candidates_run_score ON cad.room_candidates (room_detection_run_id, candidate_score DESC);
CREATE INDEX idx_text_room_selected ON cad.text_room_matches (room_candidate_id) WHERE selected_as_room_name = true;
CREATE INDEX idx_match_candidates_rank ON cad.ai_cad_match_candidates (match_run_id, extraction_id, rank_no);
CREATE INDEX idx_match_auto ON cad.ai_cad_match_candidates (match_run_id, decision) WHERE decision = 'AUTO_MATCH';

COMMIT;
