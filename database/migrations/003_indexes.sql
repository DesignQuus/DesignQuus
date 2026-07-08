BEGIN;

CREATE INDEX idx_projects_tenant_status ON project.projects (tenant_id, status);
CREATE INDEX idx_revisions_project_created ON project.revisions (project_id, created_at DESC);

CREATE INDEX idx_file_versions_file_version ON document.file_versions (file_id, version_no DESC);
CREATE INDEX idx_import_jobs_revision_status ON document.import_jobs (project_revision_id, status);
CREATE INDEX idx_extractions_job_review ON document.extractions (import_job_id, review_status);
CREATE INDEX idx_extractions_geometry ON document.extractions USING gist (geometry);
CREATE INDEX idx_extractions_bbox_gin ON document.extractions USING gin (bounding_box);

CREATE INDEX idx_spaces_revision_type ON model.spaces (project_revision_id, space_type_code);
CREATE INDEX idx_spaces_geometry ON model.spaces USING gist (geometry);
CREATE INDEX idx_equipment_revision_type ON model.equipment_instances (project_revision_id, equipment_type_code);
CREATE INDEX idx_equipment_attributes ON model.equipment_instances USING gin (attributes);
CREATE INDEX idx_nodes_system ON model.nodes (system_id);
CREATE INDEX idx_nodes_geometry ON model.nodes USING gist (geometry);
CREATE INDEX idx_edges_system ON model.edges (system_id);
CREATE INDEX idx_edges_from_to ON model.edges (from_node_id, to_node_id);
CREATE INDEX idx_edges_geometry ON model.edges USING gist (geometry);

CREATE INDEX idx_rule_versions_effective ON compliance.rule_versions (rule_id, effective_from, effective_to);
CREATE INDEX idx_rule_versions_expression ON compliance.rule_versions USING gin (expression_json);
CREATE INDEX idx_rule_runs_revision_status ON compliance.rule_runs (project_revision_id, status);
CREATE INDEX idx_rule_results_revision_severity ON compliance.rule_results (project_revision_id, severity, result_status);
CREATE INDEX idx_rule_results_evidence ON compliance.rule_results USING gin (evidence_json);

CREATE INDEX idx_calc_runs_revision_code ON calculation.runs (project_revision_id, calculation_code, created_at DESC);
CREATE INDEX idx_calc_inputs_run_code ON calculation.inputs (run_id, parameter_code);
CREATE INDEX idx_calc_results_run_code ON calculation.results (run_id, result_code);

CREATE INDEX idx_approval_requests_revision_status ON approval.requests (project_revision_id, status);
CREATE INDEX idx_approval_decisions_request ON approval.decisions (approval_request_id, decided_at);

CREATE INDEX idx_jobs_claim
    ON ops.jobs (priority, available_at, created_at)
    WHERE status = 'QUEUED';

CREATE INDEX idx_jobs_running
    ON ops.jobs (locked_at)
    WHERE status = 'RUNNING';

CREATE INDEX idx_audit_project_time ON audit.events (project_id, occurred_at DESC);
CREATE INDEX idx_audit_payload ON audit.events USING gin (payload);

COMMIT;
