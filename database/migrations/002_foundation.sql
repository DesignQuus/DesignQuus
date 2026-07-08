BEGIN;

-- ============================================================
-- INFRASTRUCTURE TABLES
-- ============================================================

CREATE TABLE auth.tenants (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_code text NOT NULL UNIQUE,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.users (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    email text NOT NULL,
    display_name text NOT NULL,
    role_code text NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

-- ============================================================
-- PROJECT DOMAIN (2)
-- ============================================================

CREATE TABLE project.projects (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_code text NOT NULL,
    project_name text NOT NULL,
    customer_name text,
    address text,
    latitude numeric(9,6),
    longitude numeric(9,6),
    project_type text NOT NULL,
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN (
            'DRAFT', 'DATA_COLLECTION', 'DRAWING_ANALYSIS',
            'ENGINEERING', 'REVIEW', 'APPROVED', 'CONSTRUCTION',
            'COMMISSIONING', 'COMPLETED', 'OPERATING', 'ARCHIVED'
        )),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id),
    UNIQUE (tenant_id, project_code)
);

CREATE TABLE project.revisions (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    revision_no integer NOT NULL CHECK (revision_no > 0),
    title text NOT NULL,
    based_on_revision_id uuid REFERENCES project.revisions(id),
    reason text,
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SUPERSEDED', 'VOID')),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    UNIQUE (project_id, revision_no)
);

-- ============================================================
-- DOCUMENT DOMAIN (4)
-- ============================================================

CREATE TABLE document.files (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    file_name text NOT NULL,
    original_file_name text NOT NULL,
    file_type text NOT NULL
        CHECK (file_type IN ('DWG', 'DXF', 'PDF', 'IFC', 'IMAGE', 'EXCEL', 'CATALOG', 'SPECIFICATION', 'OTHER')),
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
    storage_key text NOT NULL,
    sha256_hash char(64) NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'ARCHIVED', 'VOID')),
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    uploaded_by uuid REFERENCES auth.users(id),
    UNIQUE (tenant_id, storage_key)
);

CREATE TABLE document.file_versions (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    file_id uuid NOT NULL REFERENCES document.files(id),
    version_no integer NOT NULL CHECK (version_no > 0),
    storage_key text NOT NULL,
    file_hash char(64) NOT NULL,
    source_system text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    UNIQUE (file_id, version_no)
);

CREATE TABLE document.import_jobs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    source_file_version_id uuid NOT NULL REFERENCES document.file_versions(id),
    import_type text NOT NULL
        CHECK (import_type IN ('DRAWING_AI', 'CAD_OBJECT', 'IFC', 'OCR', 'CATALOG')),
    status text NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED', 'PROCESSING', 'REVIEW_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELLED')),
    ai_model text,
    ai_model_version text,
    started_at timestamptz,
    completed_at timestamptz,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE document.extractions (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    import_job_id uuid NOT NULL REFERENCES document.import_jobs(id),
    object_type text NOT NULL,
    raw_value text,
    normalized_value text,
    confidence_score numeric(5,4) NOT NULL
        CHECK (confidence_score >= 0 AND confidence_score <= 1),
    geometry geometry(Geometry),
    bounding_box jsonb,
    source_page integer,
    source_layer text,
    review_status text NOT NULL DEFAULT 'PENDING'
        CHECK (review_status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CORRECTED')),
    reviewed_by uuid REFERENCES auth.users(id),
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ENGINEERING CORE MODEL (8)
-- ============================================================

CREATE TABLE model.buildings (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    building_code text NOT NULL,
    name text NOT NULL,
    main_use text,
    sub_use text,
    gross_area_m2 numeric(14,3),
    building_area_m2 numeric(14,3),
    above_ground_floors integer,
    below_ground_floors integer,
    height_mm numeric(14,3),
    geometry geometry(Geometry),
    status text NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'ARCHIVED', 'SUPERSEDED', 'VOID')),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    UNIQUE (project_revision_id, building_code)
);

CREATE TABLE model.floors (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    building_id uuid NOT NULL REFERENCES model.buildings(id),
    floor_code text NOT NULL,
    floor_name text NOT NULL,
    level_mm numeric(14,3),
    geometry geometry(Geometry),
    status text NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'ARCHIVED', 'SUPERSEDED', 'VOID')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (building_id, floor_code)
);

CREATE TABLE model.spaces (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    floor_id uuid NOT NULL REFERENCES model.floors(id),
    space_code text NOT NULL,
    space_name text NOT NULL,
    space_type_code text NOT NULL,
    area_m2 numeric(14,3) CHECK (area_m2 IS NULL OR area_m2 >= 0),
    volume_m3 numeric(14,3) CHECK (volume_m3 IS NULL OR volume_m3 >= 0),
    ceiling_height_mm numeric(14,3) CHECK (ceiling_height_mm IS NULL OR ceiling_height_mm >= 0),
    occupancy_design integer CHECK (occupancy_design IS NULL OR occupancy_design >= 0),
    occupancy_normal integer CHECK (occupancy_normal IS NULL OR occupancy_normal >= 0),
    geometry geometry(Geometry),
    source_extraction_id uuid REFERENCES document.extractions(id),
    status text NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'ARCHIVED', 'SUPERSEDED', 'VOID')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_revision_id, space_code)
);

CREATE TABLE model.systems (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    system_code text NOT NULL,
    system_name text NOT NULL,
    system_type text NOT NULL
        CHECK (system_type IN (
            'VRF', 'VENTILATION', 'SUPPLY_AIR', 'EXHAUST_AIR',
            'CHILLED_WATER', 'HEATING_WATER', 'DOMESTIC_HOT_WATER',
            'REFRIGERANT', 'CONDENSATE', 'CONTROL', 'ELECTRICAL'
        )),
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'ACTIVE', 'APPROVED', 'SUPERSEDED', 'VOID')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_revision_id, system_code)
);

CREATE TABLE model.equipment_instances (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    system_id uuid REFERENCES model.systems(id),
    space_id uuid REFERENCES model.spaces(id),
    equipment_code text NOT NULL,
    equipment_type_code text NOT NULL,
    catalog_model_revision_id uuid,
    position_geometry geometry(Point),
    orientation_deg numeric(8,3),
    design_status text NOT NULL DEFAULT 'PROPOSED'
        CHECK (design_status IN ('PROPOSED', 'SELECTED', 'APPROVED', 'SUPERSEDED', 'VOID')),
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_revision_id, equipment_code)
);

CREATE TABLE model.ports (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    equipment_instance_id uuid NOT NULL REFERENCES model.equipment_instances(id),
    port_code text NOT NULL,
    port_type text NOT NULL,
    flow_direction text NOT NULL
        CHECK (flow_direction IN ('IN', 'OUT', 'BIDIRECTIONAL')),
    medium_type text NOT NULL,
    nominal_size numeric(14,3),
    unit text,
    position_geometry geometry(Point),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (equipment_instance_id, port_code)
);

CREATE TABLE model.nodes (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    system_id uuid NOT NULL REFERENCES model.systems(id),
    node_type text NOT NULL
        CHECK (node_type IN ('JUNCTION', 'BRANCH', 'TERMINAL', 'EQUIPMENT_CONNECTION', 'SOURCE', 'SINK')),
    geometry geometry(Point),
    elevation_mm numeric(14,3),
    connected_port_id uuid REFERENCES model.ports(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE model.edges (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    system_id uuid NOT NULL REFERENCES model.systems(id),
    from_node_id uuid NOT NULL REFERENCES model.nodes(id),
    to_node_id uuid NOT NULL REFERENCES model.nodes(id),
    edge_type text NOT NULL
        CHECK (edge_type IN ('DUCT', 'PIPE', 'REFRIGERANT_PIPE', 'DRAIN', 'CABLE', 'CONTROL_LINE')),
    medium_type text NOT NULL,
    length_mm numeric(16,3) CHECK (length_mm IS NULL OR length_mm >= 0),
    geometry geometry(Geometry),
    design_flow numeric(18,6),
    flow_unit text,
    design_velocity numeric(18,6),
    velocity_unit text,
    size_1 numeric(14,3),
    size_2 numeric(14,3),
    size_unit text,
    pressure_loss numeric(18,6),
    pressure_unit text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (from_node_id <> to_node_id)
);

-- ============================================================
-- COMPLIANCE DOMAIN (4)
-- ============================================================

CREATE TABLE compliance.rules (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    rule_code text NOT NULL,
    rule_name text NOT NULL,
    category text NOT NULL,
    owner text,
    status text NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, rule_code)
);

CREATE TABLE compliance.rule_versions (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    rule_id uuid NOT NULL REFERENCES compliance.rules(id),
    version_no integer NOT NULL CHECK (version_no > 0),
    effective_from date NOT NULL,
    effective_to date,
    expression_json jsonb NOT NULL,
    severity text NOT NULL
        CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'BLOCKER')),
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'TESTING', 'APPROVED', 'RETIRED')),
    approved_by uuid REFERENCES auth.users(id),
    approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to >= effective_from),
    UNIQUE (rule_id, version_no)
);

CREATE TABLE compliance.rule_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    rule_version_id uuid NOT NULL REFERENCES compliance.rule_versions(id),
    input_snapshot_hash char(64) NOT NULL,
    status text NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE compliance.rule_results (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    rule_run_id uuid NOT NULL REFERENCES compliance.rule_runs(id),
    target_type text NOT NULL,
    target_id uuid,
    result_status text NOT NULL
        CHECK (result_status IN ('PASS', 'FAIL', 'NOT_APPLICABLE', 'REVIEW_REQUIRED')),
    severity text NOT NULL
        CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'BLOCKER')),
    message text NOT NULL,
    evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CALCULATION DOMAIN (3)
-- ============================================================

CREATE TABLE calculation.runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    calculation_code text NOT NULL,
    calculation_version text NOT NULL,
    target_type text NOT NULL,
    target_id uuid,
    input_snapshot_hash char(64) NOT NULL,
    idempotency_key text,
    status text NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    engine_name text NOT NULL,
    engine_version text NOT NULL,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE calculation.inputs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    run_id uuid NOT NULL REFERENCES calculation.runs(id),
    parameter_code text NOT NULL,
    value_numeric numeric(24,9),
    value_text text,
    value_json jsonb,
    unit text,
    source_type text NOT NULL,
    source_id uuid,
    source_confidence numeric(5,4)
        CHECK (source_confidence IS NULL OR (source_confidence >= 0 AND source_confidence <= 1)),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (value_numeric IS NOT NULL)::integer +
        (value_text IS NOT NULL)::integer +
        (value_json IS NOT NULL)::integer = 1
    )
);

CREATE TABLE calculation.results (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    run_id uuid NOT NULL REFERENCES calculation.runs(id),
    result_code text NOT NULL,
    value_numeric numeric(24,9),
    value_text text,
    value_json jsonb,
    unit text,
    tolerance numeric(24,9),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (value_numeric IS NOT NULL)::integer +
        (value_text IS NOT NULL)::integer +
        (value_json IS NOT NULL)::integer = 1
    )
);

-- ============================================================
-- APPROVAL DOMAIN (2)
-- ============================================================

CREATE TABLE approval.requests (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    workflow_code text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REVISION_REQUIRED', 'CANCELLED')),
    requested_by uuid REFERENCES auth.users(id),
    requested_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE TABLE approval.decisions (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    approval_request_id uuid NOT NULL REFERENCES approval.requests(id),
    step_code text NOT NULL,
    decision text NOT NULL
        CHECK (decision IN ('APPROVED', 'REJECTED', 'REVISION_REQUIRED')),
    comment text,
    evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    decided_by uuid NOT NULL REFERENCES auth.users(id),
    decided_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ASYNC JOB + AUDIT
-- ============================================================

CREATE TABLE ops.jobs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid REFERENCES project.projects(id),
    project_revision_id uuid REFERENCES project.revisions(id),
    job_type text NOT NULL,
    payload jsonb NOT NULL,
    idempotency_key text,
    status text NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED', 'RUNNING', 'REVIEW_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELLED')),
    priority integer NOT NULL DEFAULT 100,
    available_at timestamptz NOT NULL DEFAULT now(),
    locked_at timestamptz,
    locked_by text,
    attempt_count integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE audit.events (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid REFERENCES project.projects(id),
    project_revision_id uuid REFERENCES project.revisions(id),
    event_type text NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id uuid,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    actor_id uuid REFERENCES auth.users(id),
    occurred_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
