BEGIN;

CREATE TABLE model.space_design_profiles (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    space_id uuid NOT NULL REFERENCES model.spaces(id),
    profile_version integer NOT NULL CHECK (profile_version > 0),
    space_type_code text NOT NULL,
    occupancy_design numeric(12,3)
        CHECK (occupancy_design IS NULL OR occupancy_design >= 0),
    occupancy_normal numeric(12,3)
        CHECK (occupancy_normal IS NULL OR occupancy_normal >= 0),
    ceiling_height_m numeric(12,4)
        CHECK (ceiling_height_m IS NULL OR ceiling_height_m > 0),
    volume_m3 numeric(18,6)
        CHECK (volume_m3 IS NULL OR volume_m3 > 0),
    exterior_wall_area_m2 numeric(18,6)
        CHECK (exterior_wall_area_m2 IS NULL OR exterior_wall_area_m2 >= 0),
    window_area_m2 numeric(18,6)
        CHECK (window_area_m2 IS NULL OR window_area_m2 >= 0),
    operating_schedule_code text,
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN (
            'DRAFT','REVIEW_REQUIRED','READY',
            'APPROVED','SUPERSEDED','VOID'
        )),
    conflict_count integer NOT NULL DEFAULT 0 CHECK (conflict_count >= 0),
    missing_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
    conflicts jsonb NOT NULL DEFAULT '[]'::jsonb,
    resolved_snapshot jsonb NOT NULL,
    resolver_version text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    approved_at timestamptz,
    approved_by uuid REFERENCES auth.users(id),
    UNIQUE (space_id, profile_version)
);

CREATE TABLE model.space_profile_evidence (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    space_design_profile_id uuid NOT NULL
        REFERENCES model.space_design_profiles(id) ON DELETE CASCADE,
    field_code text NOT NULL,
    source_type text NOT NULL CHECK (source_type IN (
        'USER_CONFIRMED','IFC_VERIFIED','CAD_EXACT',
        'CAD_TEXT','AI_EXTRACTION','PROJECT_DEFAULT',
        'SYSTEM_DEFAULT','DERIVED'
    )),
    source_id uuid,
    source_value jsonb NOT NULL,
    confidence_score numeric(6,5)
        CHECK (
            confidence_score IS NULL OR
            confidence_score BETWEEN 0 AND 1
        ),
    priority integer NOT NULL,
    selected boolean NOT NULL DEFAULT false,
    conflict_group text,
    evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE compliance.authoritative_sources (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    source_code text NOT NULL,
    title text NOT NULL,
    authority text NOT NULL,
    source_type text NOT NULL CHECK (source_type IN (
        'LAW','ENFORCEMENT_DECREE','ENFORCEMENT_RULE',
        'KDS','KCS','KS','INTERNAL_STANDARD'
    )),
    effective_from date NOT NULL,
    effective_to date,
    source_status text NOT NULL DEFAULT 'METADATA_ONLY'
        CHECK (source_status IN (
            'METADATA_ONLY','CONTENT_VERIFIED','RETIRED'
        )),
    official_locator text NOT NULL,
    content_hash char(64),
    verified_at timestamptz,
    verified_by uuid REFERENCES auth.users(id),
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to >= effective_from),
    UNIQUE (tenant_id, source_code, effective_from)
);

CREATE TABLE compliance.ventilation_rule_sets (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    authoritative_source_id uuid NOT NULL
        REFERENCES compliance.authoritative_sources(id),
    rule_code text NOT NULL,
    version_no integer NOT NULL CHECK (version_no > 0),
    name text NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    priority integer NOT NULL DEFAULT 100,
    legal_effect text NOT NULL DEFAULT 'ENGINEERING_STANDARD'
        CHECK (legal_effect IN (
            'LEGAL_REQUIREMENT','ENGINEERING_STANDARD',
            'PROJECT_REQUIREMENT','INTERNAL_POLICY'
        )),
    conditions_json jsonb NOT NULL,
    calculation_method text NOT NULL CHECK (calculation_method IN (
        'PER_PERSON','PER_AREA','ACH','MAX_OF','SUM_OF'
    )),
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','TESTING','APPROVED','RETIRED')),
    approved_at timestamptz,
    approved_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to >= effective_from),
    UNIQUE (tenant_id, rule_code, version_no)
);

CREATE TABLE compliance.ventilation_rule_parameters (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    ventilation_rule_set_id uuid NOT NULL
        REFERENCES compliance.ventilation_rule_sets(id) ON DELETE CASCADE,
    parameter_code text NOT NULL CHECK (parameter_code IN (
        'PER_PERSON_M3_H',
        'PER_AREA_M3_H_M2',
        'AIR_CHANGES_PER_HOUR',
        'MINIMUM_FLOW_M3_H'
    )),
    value_numeric numeric(24,9) NOT NULL CHECK (value_numeric >= 0),
    unit text NOT NULL,
    source_clause text NOT NULL,
    verification_status text NOT NULL DEFAULT 'UNVERIFIED'
        CHECK (verification_status IN ('UNVERIFIED','VERIFIED','REJECTED')),
    verified_at timestamptz,
    verified_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (ventilation_rule_set_id, parameter_code)
);

CREATE TABLE workflow.space_ventilation_runs (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    project_id uuid NOT NULL REFERENCES project.projects(id),
    project_revision_id uuid NOT NULL REFERENCES project.revisions(id),
    reference_date date NOT NULL,
    rule_engine_version text NOT NULL,
    profile_resolver_version text NOT NULL,
    status text NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN (
            'QUEUED','RESOLVING_PROFILES','SELECTING_RULES',
            'CALCULATING','REVIEW_REQUIRED',
            'READY_FOR_SELECTION','COMPLETED','FAILED','CANCELLED'
        )),
    space_count integer NOT NULL DEFAULT 0 CHECK (space_count >= 0),
    ready_count integer NOT NULL DEFAULT 0 CHECK (ready_count >= 0),
    blocker_count integer NOT NULL DEFAULT 0 CHECK (blocker_count >= 0),
    policy_snapshot jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    completed_at timestamptz,
    error_message text
);

CREATE TABLE workflow.space_ventilation_items (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id uuid NOT NULL REFERENCES auth.tenants(id),
    space_ventilation_run_id uuid NOT NULL
        REFERENCES workflow.space_ventilation_runs(id) ON DELETE CASCADE,
    space_id uuid NOT NULL REFERENCES model.spaces(id),
    space_design_profile_id uuid
        REFERENCES model.space_design_profiles(id),
    ventilation_rule_set_id uuid
        REFERENCES compliance.ventilation_rule_sets(id),
    calculation_run_id uuid REFERENCES calculation.runs(id),
    status text NOT NULL DEFAULT 'PENDING'
        CHECK (status IN (
            'PENDING','PROFILE_REVIEW_REQUIRED',
            'RULE_NOT_FOUND','RULE_UNVERIFIED',
            'CALCULATION_READY','CALCULATED',
            'READY_FOR_SELECTION','BLOCKED'
        )),
    required_flow_m3_h numeric(18,6)
        CHECK (required_flow_m3_h IS NULL OR required_flow_m3_h >= 0),
    calculation_method text,
    selection_requirement_json jsonb,
    blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
    evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (space_ventilation_run_id, space_id)
);

ALTER TABLE model.spaces
    ADD COLUMN IF NOT EXISTS active_design_profile_id uuid;

ALTER TABLE model.spaces
    ADD CONSTRAINT fk_spaces_active_design_profile
    FOREIGN KEY (active_design_profile_id)
    REFERENCES model.space_design_profiles(id);

CREATE INDEX idx_space_profiles_space_version
    ON model.space_design_profiles (space_id, profile_version DESC);

CREATE INDEX idx_space_profiles_status
    ON model.space_design_profiles (
        project_revision_id, status
    );

CREATE INDEX idx_space_profile_evidence_field
    ON model.space_profile_evidence (
        space_design_profile_id, field_code, selected
    );

CREATE INDEX idx_authoritative_sources_effective
    ON compliance.authoritative_sources (
        source_code, effective_from, effective_to
    );

CREATE INDEX idx_vent_rule_sets_selection
    ON compliance.ventilation_rule_sets (
        tenant_id, status, effective_from, effective_to, priority
    );

CREATE INDEX idx_vent_rule_parameters_rule
    ON compliance.ventilation_rule_parameters (
        ventilation_rule_set_id, verification_status
    );

CREATE INDEX idx_space_vent_runs_status
    ON workflow.space_ventilation_runs (
        project_revision_id, status, created_at DESC
    );

CREATE INDEX idx_space_vent_items_status
    ON workflow.space_ventilation_items (
        space_ventilation_run_id, status
    );

COMMIT;
