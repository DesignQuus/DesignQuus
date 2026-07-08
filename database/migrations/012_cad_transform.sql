BEGIN;

CREATE SCHEMA IF NOT EXISTS cad;

CREATE TABLE cad.import_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    source_file_version_id uuid NOT NULL REFERENCES document.file_versions(id),
    source_format text NOT NULL CHECK (source_format IN ('DWG','DXF')),
    converted_file_version_id uuid REFERENCES document.file_versions(id),
    converter_adapter text,
    parser_adapter text NOT NULL,
    parser_version text NOT NULL,
    status text NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN (
            'QUEUED','CONVERTING','PARSING','COMPLETED',
            'REVIEW_REQUIRED','FAILED','CANCELLED'
        )),
    source_units text,
    object_count integer NOT NULL DEFAULT 0 CHECK (object_count >= 0),
    started_at timestamptz,
    completed_at timestamptz,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE cad.objects (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    cad_import_run_id uuid NOT NULL REFERENCES cad.import_runs(id),
    source_file_version_id uuid NOT NULL REFERENCES document.file_versions(id),
    entity_type text NOT NULL CHECK (entity_type IN (
        'LAYER','TEXT','MTEXT','BLOCK_REFERENCE',
        'LINE','LWPOLYLINE','POLYLINE','CIRCLE','ARC','POINT','OTHER'
    )),
    handle text,
    layer_name text NOT NULL,
    coordinate_space text NOT NULL DEFAULT 'CAD_MODEL'
        CHECK (coordinate_space = 'CAD_MODEL'),
    geometry_json jsonb,
    text_value text,
    block_name text,
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
    bbox_json jsonb,
    source_order integer,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cad.transform_calibrations (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    source_file_version_id uuid NOT NULL REFERENCES document.file_versions(id),
    target_file_version_id uuid NOT NULL REFERENCES document.file_versions(id),
    source_coordinate_space text NOT NULL DEFAULT 'CAD_MODEL'
        CHECK (source_coordinate_space = 'CAD_MODEL'),
    target_coordinate_space text NOT NULL DEFAULT 'PAGE_NORMALIZED'
        CHECK (target_coordinate_space = 'PAGE_NORMALIZED'),
    transform_type text NOT NULL DEFAULT 'AFFINE_2D'
        CHECK (transform_type IN ('AFFINE_2D')),
    matrix_json jsonb NOT NULL,
    inverse_matrix_json jsonb NOT NULL,
    control_point_count integer NOT NULL CHECK (control_point_count >= 3),
    rmse numeric(18,10) NOT NULL CHECK (rmse >= 0),
    max_error numeric(18,10) NOT NULL CHECK (max_error >= 0),
    tolerance numeric(18,10) NOT NULL CHECK (tolerance > 0),
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','VALIDATED','REJECTED','SUPERSEDED','VOID')),
    calculated_at timestamptz NOT NULL DEFAULT now(),
    validated_by uuid REFERENCES auth.users(id),
    validated_at timestamptz
);

CREATE TABLE cad.transform_control_points (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    calibration_id uuid NOT NULL REFERENCES cad.transform_calibrations(id) ON DELETE CASCADE,
    point_no integer NOT NULL CHECK (point_no > 0),
    cad_x numeric(24,10) NOT NULL,
    cad_y numeric(24,10) NOT NULL,
    page_x numeric(18,12) NOT NULL CHECK (page_x BETWEEN 0 AND 1),
    page_y numeric(18,12) NOT NULL CHECK (page_y BETWEEN 0 AND 1),
    residual_error numeric(18,10),
    label text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (calibration_id, point_no)
);

CREATE TABLE cad.object_links (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    cad_object_id uuid NOT NULL REFERENCES cad.objects(id),
    extraction_id uuid REFERENCES document.extractions(id),
    space_id uuid REFERENCES model.spaces(id),
    link_type text NOT NULL CHECK (link_type IN (
        'AI_MATCH','USER_MATCH','PROMOTED_SPACE','GEOMETRY_REFERENCE'
    )),
    confidence_score numeric(5,4)
        CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1),
    evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        extraction_id IS NOT NULL OR space_id IS NOT NULL
    )
);

CREATE INDEX idx_cad_import_runs_revision_status
    ON cad.import_runs (project_revision_id, status);

CREATE INDEX idx_cad_objects_run_entity
    ON cad.objects (cad_import_run_id, entity_type);

CREATE INDEX idx_cad_objects_layer
    ON cad.objects (cad_import_run_id, layer_name);

CREATE INDEX idx_cad_objects_geometry_gin
    ON cad.objects USING gin (geometry_json);

CREATE INDEX idx_cad_transform_project_status
    ON cad.transform_calibrations (project_revision_id, status, calculated_at DESC);

CREATE INDEX idx_cad_links_extraction
    ON cad.object_links (extraction_id)
    WHERE extraction_id IS NOT NULL;

CREATE INDEX idx_cad_links_space
    ON cad.object_links (space_id)
    WHERE space_id IS NOT NULL;

COMMIT;
