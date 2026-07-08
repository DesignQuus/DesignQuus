BEGIN;

CREATE TABLE compliance.rule_drafts (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    authoritative_source_id uuid NOT NULL
        REFERENCES compliance.authoritative_sources(id),
    rule_code text NOT NULL,
    draft_version integer NOT NULL CHECK (draft_version > 0),
    name text NOT NULL,
    source_clause text NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    priority integer NOT NULL DEFAULT 100,
    legal_effect text NOT NULL CHECK (legal_effect IN (
        'LEGAL_REQUIREMENT','ENGINEERING_STANDARD',
        'PROJECT_REQUIREMENT','INTERNAL_POLICY'
    )),
    conditions_json jsonb NOT NULL,
    calculation_method text NOT NULL CHECK (calculation_method IN (
        'PER_PERSON','PER_AREA','ACH','MAX_OF','SUM_OF'
    )),
    parameters_json jsonb NOT NULL,
    compile_status text NOT NULL DEFAULT 'DRAFT'
        CHECK (compile_status IN (
            'DRAFT','COMPILED','COMPILE_FAILED'
        )),
    compile_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
    lifecycle_status text NOT NULL DEFAULT 'DRAFT'
        CHECK (lifecycle_status IN (
            'DRAFT','TESTING','TEST_PASSED','TEST_FAILED',
            'EXPERT_REVIEW','APPROVED','REJECTED','RETIRED'
        )),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id),
    UNIQUE (tenant_id, rule_code, draft_version),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE compliance.rule_test_suites (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    rule_draft_id uuid NOT NULL
        REFERENCES compliance.rule_drafts(id) ON DELETE CASCADE,
    suite_name text NOT NULL,
    required_case_count integer NOT NULL DEFAULT 1
        CHECK (required_case_count > 0),
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','READY','RETIRED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE compliance.rule_test_cases (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    rule_test_suite_id uuid NOT NULL
        REFERENCES compliance.rule_test_suites(id) ON DELETE CASCADE,
    case_no integer NOT NULL CHECK (case_no > 0),
    case_name text NOT NULL,
    input_json jsonb NOT NULL,
    expected_json jsonb NOT NULL,
    required boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (rule_test_suite_id, case_no)
);

CREATE TABLE compliance.rule_test_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    rule_draft_id uuid NOT NULL REFERENCES compliance.rule_drafts(id),
    rule_test_suite_id uuid NOT NULL REFERENCES compliance.rule_test_suites(id),
    engine_version text NOT NULL,
    status text NOT NULL DEFAULT 'RUNNING'
        CHECK (status IN ('RUNNING','PASSED','FAILED','ERROR','CANCELLED')),
    total_count integer NOT NULL DEFAULT 0 CHECK (total_count >= 0),
    passed_count integer NOT NULL DEFAULT 0 CHECK (passed_count >= 0),
    failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
    error_count integer NOT NULL DEFAULT 0 CHECK (error_count >= 0),
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    triggered_by uuid REFERENCES auth.users(id)
);

CREATE TABLE compliance.rule_test_results (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    rule_test_run_id uuid NOT NULL
        REFERENCES compliance.rule_test_runs(id) ON DELETE CASCADE,
    rule_test_case_id uuid NOT NULL REFERENCES compliance.rule_test_cases(id),
    status text NOT NULL CHECK (status IN ('PASSED','FAILED','ERROR')),
    actual_json jsonb,
    diff_json jsonb,
    error_message text,
    duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (rule_test_run_id, rule_test_case_id)
);

CREATE TABLE compliance.project_applicability_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    reference_date date NOT NULL,
    engine_version text NOT NULL,
    status text NOT NULL DEFAULT 'RUNNING'
        CHECK (status IN ('RUNNING','COMPLETED','REVIEW_REQUIRED','FAILED','CANCELLED')),
    rule_count integer NOT NULL DEFAULT 0 CHECK (rule_count >= 0),
    applicable_count integer NOT NULL DEFAULT 0 CHECK (applicable_count >= 0),
    review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    completed_at timestamptz,
    error_message text
);

CREATE TABLE compliance.project_applicability_items (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_applicability_run_id uuid NOT NULL
        REFERENCES compliance.project_applicability_runs(id) ON DELETE CASCADE,
    ventilation_rule_set_id uuid NOT NULL
        REFERENCES compliance.ventilation_rule_sets(id),
    target_type text NOT NULL CHECK (target_type IN ('PROJECT','BUILDING','SPACE')),
    target_id uuid,
    result_status text NOT NULL CHECK (result_status IN (
        'APPLICABLE','NOT_APPLICABLE','REVIEW_REQUIRED','BLOCKED'
    )),
    matched_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
    failed_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
    missing_inputs jsonb NOT NULL DEFAULT '[]'::jsonb,
    evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE catalog.catalog_import_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    manufacturer_id uuid NOT NULL REFERENCES catalog.manufacturers(id),
    source_file_id uuid REFERENCES document.files(id),
    source_format text NOT NULL CHECK (source_format IN (
        'CSV','JSON','EXCEL','PDF','API'
    )),
    adapter_code text NOT NULL,
    mapping_version text NOT NULL,
    status text NOT NULL DEFAULT 'UPLOADED'
        CHECK (status IN (
            'UPLOADED','MAPPED','NORMALIZING','VALIDATING',
            'REVIEW_REQUIRED','READY_TO_PUBLISH',
            'PUBLISHED','FAILED','CANCELLED'
        )),
    raw_row_count integer NOT NULL DEFAULT 0 CHECK (raw_row_count >= 0),
    valid_row_count integer NOT NULL DEFAULT 0 CHECK (valid_row_count >= 0),
    error_row_count integer NOT NULL DEFAULT 0 CHECK (error_row_count >= 0),
    duplicate_count integer NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
    import_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    completed_at timestamptz,
    error_message text
);

CREATE TABLE catalog.catalog_import_rows (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    catalog_import_run_id uuid NOT NULL
        REFERENCES catalog.catalog_import_runs(id) ON DELETE CASCADE,
    row_no integer NOT NULL CHECK (row_no > 0),
    raw_json jsonb NOT NULL,
    normalized_json jsonb,
    validation_status text NOT NULL DEFAULT 'PENDING'
        CHECK (validation_status IN (
            'PENDING','VALID','WARNING','ERROR','DUPLICATE'
        )),
    validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
    validation_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
    matched_product_model_id uuid REFERENCES catalog.product_models(id),
    published_product_revision_id uuid REFERENCES catalog.product_revisions(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (catalog_import_run_id, row_no)
);

CREATE TABLE catalog.catalog_field_mappings (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    manufacturer_id uuid NOT NULL REFERENCES catalog.manufacturers(id),
    mapping_code text NOT NULL,
    mapping_version integer NOT NULL CHECK (mapping_version > 0),
    source_format text NOT NULL CHECK (source_format IN (
        'CSV','JSON','EXCEL','PDF','API'
    )),
    field_mapping_json jsonb NOT NULL,
    unit_mapping_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    transforms_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','TESTING','APPROVED','RETIRED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    approved_at timestamptz,
    approved_by uuid REFERENCES auth.users(id),
    UNIQUE (tenant_id, mapping_code, mapping_version)
);

CREATE INDEX idx_rule_drafts_code_status
    ON compliance.rule_drafts (tenant_id, rule_code, lifecycle_status);

CREATE INDEX idx_rule_test_runs_draft_time
    ON compliance.rule_test_runs (rule_draft_id, started_at DESC);

CREATE INDEX idx_applicability_runs_revision
    ON compliance.project_applicability_runs (
        project_revision_id, reference_date, created_at DESC
    );

CREATE INDEX idx_applicability_items_status
    ON compliance.project_applicability_items (
        project_applicability_run_id, result_status
    );

CREATE INDEX idx_catalog_import_runs_status
    ON catalog.catalog_import_runs (
        manufacturer_id, status, created_at DESC
    );

CREATE INDEX idx_catalog_import_rows_status
    ON catalog.catalog_import_rows (
        catalog_import_run_id, validation_status
    );

CREATE INDEX idx_catalog_field_mappings_status
    ON catalog.catalog_field_mappings (
        manufacturer_id, status
    );

COMMIT;
