\set ON_ERROR_STOP on

DELETE FROM workflow.erv_design_runs
WHERE tenant_id = '90000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM ops.idempotency_records
WHERE tenant_id = '90000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM document.extractions
WHERE tenant_id = '90000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM document.import_jobs
WHERE tenant_id = '90000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM document.file_versions
WHERE tenant_id = '90000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM document.files
WHERE tenant_id = '90000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM project.revisions
WHERE tenant_id = '90000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM project.projects
WHERE tenant_id = '90000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM auth.tenants
WHERE id = '90000000-0000-7000-8000-000000000000'::uuid;

INSERT INTO auth.tenants (id, tenant_code, name)
VALUES (
    '90000000-0000-7000-8000-000000000000',
    'PERF-CERT',
    'Performance Certification Tenant'
);

INSERT INTO project.projects (
    id,
    tenant_id,
    project_code,
    project_name,
    project_type,
    status
)
VALUES (
    '90000000-0000-7000-8000-000000000001',
    '90000000-0000-7000-8000-000000000000',
    'PERF-PROJECT-001',
    'Performance Certification Project',
    'CERTIFICATION',
    'ENGINEERING'
);

INSERT INTO project.revisions (
    id,
    tenant_id,
    project_id,
    revision_no,
    title,
    status
)
VALUES (
    '90000000-0000-7000-8000-000000000002',
    '90000000-0000-7000-8000-000000000000',
    '90000000-0000-7000-8000-000000000001',
    1,
    'Performance Baseline Revision',
    'APPROVED'
);

INSERT INTO document.files (
    id,
    tenant_id,
    project_id,
    file_name,
    original_file_name,
    file_type,
    mime_type,
    size_bytes,
    storage_key,
    sha256_hash
)
VALUES (
    '90000000-0000-7000-8000-000000000003',
    '90000000-0000-7000-8000-000000000000',
    '90000000-0000-7000-8000-000000000001',
    'performance-source.pdf',
    'performance-source.pdf',
    'PDF',
    'application/pdf',
    64,
    'performance/fixture/performance-source.pdf',
    repeat('0', 64)
);

INSERT INTO document.file_versions (
    id,
    tenant_id,
    project_id,
    file_id,
    version_no,
    storage_key,
    file_hash,
    source_system
)
VALUES (
    '90000000-0000-7000-8000-000000000004',
    '90000000-0000-7000-8000-000000000000',
    '90000000-0000-7000-8000-000000000001',
    '90000000-0000-7000-8000-000000000003',
    1,
    'performance/fixture/performance-source-v1.pdf',
    repeat('0', 64),
    'PHASE5A_FIXTURE'
);

INSERT INTO document.import_jobs (
    id,
    tenant_id,
    project_id,
    project_revision_id,
    source_file_version_id,
    import_type,
    status,
    ai_model,
    ai_model_version
)
VALUES (
    '90000000-0000-7000-8000-000000000005',
    '90000000-0000-7000-8000-000000000000',
    '90000000-0000-7000-8000-000000000001',
    '90000000-0000-7000-8000-000000000002',
    '90000000-0000-7000-8000-000000000004',
    'DRAWING_AI',
    'REVIEW_REQUIRED',
    'phase5a-fixture',
    '1.0'
);

INSERT INTO document.extractions (
    id,
    tenant_id,
    project_id,
    project_revision_id,
    import_job_id,
    object_type,
    raw_value,
    normalized_value,
    confidence_score,
    review_status
)
SELECT
    ('90000000-0000-7000-8000-' || lpad(series::text, 12, '0'))::uuid,
    '90000000-0000-7000-8000-000000000000'::uuid,
    '90000000-0000-7000-8000-000000000001'::uuid,
    '90000000-0000-7000-8000-000000000002'::uuid,
    '90000000-0000-7000-8000-000000000005'::uuid,
    'ROOM',
    'Performance Room ' || series,
    'Performance Room ' || series,
    0.9500,
    'PENDING'
FROM generate_series(100, 149) AS series;

INSERT INTO ops.idempotency_records (
    id,
    tenant_id,
    scope,
    idempotency_key,
    request_fingerprint,
    state,
    response_status,
    response_body,
    expires_at,
    completed_at
)
VALUES (
    '90000000-0000-7000-8000-000000000006',
    '90000000-0000-7000-8000-000000000000',
    'PERFORMANCE_READ',
    'performance-read-001',
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'COMPLETED',
    200,
    '{"fixture":"performance-read"}'::jsonb,
    now() + interval '1 day',
    now()
);

SELECT 'PERFORMANCE_FIXTURE_READY' AS result;
