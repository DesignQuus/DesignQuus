\set ON_ERROR_STOP on

DELETE FROM document.extractions
WHERE tenant_id = 'a1000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM document.import_jobs
WHERE tenant_id = 'a1000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM document.file_versions
WHERE tenant_id = 'a1000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM document.files
WHERE tenant_id = 'a1000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM project.revisions
WHERE tenant_id = 'a1000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM project.projects
WHERE tenant_id = 'a1000000-0000-7000-8000-000000000000'::uuid;

DELETE FROM auth.tenants
WHERE id = 'a1000000-0000-7000-8000-000000000000'::uuid;

INSERT INTO auth.tenants (
    id,
    tenant_code,
    name
)
VALUES (
    'a1000000-0000-7000-8000-000000000000',
    'DEPLOY-ROLLBACK',
    'Deployment Rollback Certification Tenant'
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
    'a1000000-0000-7000-8000-000000000001',
    'a1000000-0000-7000-8000-000000000000',
    'DEPLOY-ROLLBACK-PROJECT',
    'Deployment Rollback Stable Project',
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
    'a1000000-0000-7000-8000-000000000002',
    'a1000000-0000-7000-8000-000000000000',
    'a1000000-0000-7000-8000-000000000001',
    1,
    'Stable Rollback Revision',
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
    'a1000000-0000-7000-8000-000000000003',
    'a1000000-0000-7000-8000-000000000000',
    'a1000000-0000-7000-8000-000000000001',
    'rollback-stable-source.pdf',
    'rollback-stable-source.pdf',
    'PDF',
    'application/pdf',
    64,
    'deployment-rollback/stable-source.pdf',
    repeat('a', 64)
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
    'a1000000-0000-7000-8000-000000000004',
    'a1000000-0000-7000-8000-000000000000',
    'a1000000-0000-7000-8000-000000000001',
    'a1000000-0000-7000-8000-000000000003',
    1,
    'deployment-rollback/stable-source-v1.pdf',
    repeat('a', 64),
    'PHASE5B_FIXTURE'
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
    'a1000000-0000-7000-8000-000000000005',
    'a1000000-0000-7000-8000-000000000000',
    'a1000000-0000-7000-8000-000000000001',
    'a1000000-0000-7000-8000-000000000002',
    'a1000000-0000-7000-8000-000000000004',
    'DRAWING_AI',
    'REVIEW_REQUIRED',
    'phase5b-fixture',
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
VALUES (
    'a1000000-0000-7000-8000-000000000006',
    'a1000000-0000-7000-8000-000000000000',
    'a1000000-0000-7000-8000-000000000001',
    'a1000000-0000-7000-8000-000000000002',
    'a1000000-0000-7000-8000-000000000005',
    'ROOM',
    'Stable Rollback Room',
    'Stable Rollback Room',
    0.9900,
    'PENDING'
);

SELECT 'DEPLOYMENT_ROLLBACK_FIXTURE_READY' AS result;
