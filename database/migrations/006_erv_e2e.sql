BEGIN;

CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS bom;
CREATE SCHEMA IF NOT EXISTS validation;
CREATE SCHEMA IF NOT EXISTS workflow;

CREATE TABLE workflow.erv_design_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    source_file_version_id uuid NOT NULL REFERENCES document.file_versions(id),
    status text NOT NULL DEFAULT 'CREATED'
        CHECK (status IN ('CREATED','DRAWING_UPLOADED','AI_EXTRACTION_RUNNING','AI_REVIEW_REQUIRED','CORE_MODEL_READY','COMPLIANCE_RUNNING','CALCULATION_RUNNING','EQUIPMENT_SELECTION_READY','BOM_READY','REVIEW_READY','APPROVED','REJECTED','FAILED')),
    current_step text NOT NULL DEFAULT 'DRAWING',
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE catalog.manufacturers (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    manufacturer_code text NOT NULL,
    name text NOT NULL,
    country_code char(2),
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, manufacturer_code)
);

CREATE TABLE catalog.product_models (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    manufacturer_id uuid NOT NULL REFERENCES catalog.manufacturers(id),
    product_type text NOT NULL CHECK (product_type IN ('ERV','PART','CONTROLLER','SENSOR')),
    model_code text NOT NULL,
    model_name text NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISCONTINUED','REPLACED','ARCHIVED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, manufacturer_id, model_code)
);

CREATE TABLE catalog.product_revisions (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    product_model_id uuid NOT NULL REFERENCES catalog.product_models(id),
    revision_no integer NOT NULL CHECK (revision_no > 0),
    valid_from date NOT NULL,
    valid_to date,
    airflow_m3_h numeric(18,3),
    external_static_pressure_pa numeric(18,3),
    sensible_efficiency_pct numeric(8,3),
    total_efficiency_pct numeric(8,3),
    power_input_kw numeric(18,6),
    voltage_v numeric(12,3),
    phase_count integer,
    noise_db_a numeric(8,3),
    list_price numeric(18,2),
    lead_time_days integer,
    spec_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    source_document_id uuid REFERENCES document.files(id),
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUPERSEDED','VOID')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_to >= valid_from),
    UNIQUE (product_model_id, revision_no)
);

CREATE TABLE catalog.selection_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    erv_design_run_id uuid NOT NULL REFERENCES workflow.erv_design_runs(id),
    calculation_run_id uuid NOT NULL REFERENCES calculation.runs(id),
    requirements_snapshot jsonb NOT NULL,
    scoring_policy jsonb NOT NULL,
    status text NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING','COMPLETED','FAILED','CANCELLED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE TABLE catalog.selection_candidates (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    selection_run_id uuid NOT NULL REFERENCES catalog.selection_runs(id),
    product_revision_id uuid NOT NULL REFERENCES catalog.product_revisions(id),
    technically_valid boolean NOT NULL,
    rejection_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
    capacity_margin_pct numeric(12,4),
    technical_score numeric(8,4),
    energy_score numeric(8,4),
    cost_score numeric(8,4),
    delivery_score numeric(8,4),
    total_score numeric(8,4),
    rank_no integer,
    selected boolean NOT NULL DEFAULT false,
    selected_by uuid REFERENCES auth.users(id),
    selected_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (selection_run_id, product_revision_id)
);

CREATE TABLE bom.boms (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    erv_design_run_id uuid REFERENCES workflow.erv_design_runs(id),
    bom_type text NOT NULL CHECK (bom_type IN ('RULE','DESIGN','ESTIMATE','PROCUREMENT','CONSTRUCTION','AS_BUILT')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bom.versions (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    bom_id uuid NOT NULL REFERENCES bom.boms(id),
    version_no integer NOT NULL CHECK (version_no > 0),
    based_on_version_id uuid REFERENCES bom.versions(id),
    status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_REVIEW','APPROVED','SUPERSEDED','VOID')),
    generated_by text NOT NULL,
    generation_snapshot jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    UNIQUE (bom_id, version_no)
);

CREATE TABLE bom.items (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    bom_version_id uuid NOT NULL REFERENCES bom.versions(id),
    line_no integer NOT NULL CHECK (line_no > 0),
    item_type text NOT NULL CHECK (item_type IN ('EQUIPMENT','PART','MATERIAL','LABOR','OTHER')),
    product_revision_id uuid REFERENCES catalog.product_revisions(id),
    item_code text NOT NULL,
    description text NOT NULL,
    quantity numeric(18,4) NOT NULL CHECK (quantity >= 0),
    unit text NOT NULL,
    source_type text NOT NULL,
    source_id uuid,
    evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    unit_cost numeric(18,2),
    total_cost numeric(18,2),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (bom_version_id, line_no)
);

CREATE TABLE validation.findings (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    erv_design_run_id uuid REFERENCES workflow.erv_design_runs(id),
    finding_code text NOT NULL,
    category text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('INFO','WARNING','ERROR','BLOCKER')),
    target_type text,
    target_id uuid,
    message text NOT NULL,
    evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED','WAIVED','CLOSED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    resolved_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_erv_runs_revision_status ON workflow.erv_design_runs (project_revision_id, status);
CREATE INDEX idx_product_revisions_erv_filter ON catalog.product_revisions (airflow_m3_h, external_static_pressure_pa) WHERE status = 'ACTIVE';
CREATE INDEX idx_selection_candidates_run_rank ON catalog.selection_candidates (selection_run_id, technically_valid, rank_no);
CREATE INDEX idx_bom_versions_project ON bom.versions (project_revision_id, created_at DESC);
CREATE INDEX idx_findings_blockers ON validation.findings (project_revision_id, status) WHERE severity = 'BLOCKER';

COMMIT;
