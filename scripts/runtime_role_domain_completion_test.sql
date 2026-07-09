\set ON_ERROR_STOP on

DELETE FROM workflow.erv_design_runs
WHERE tenant_id IN (
    '91000000-0000-7000-8000-000000000000'::uuid,
    '92000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM document.file_versions
WHERE tenant_id IN (
    '91000000-0000-7000-8000-000000000000'::uuid,
    '92000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM document.files
WHERE tenant_id IN (
    '91000000-0000-7000-8000-000000000000'::uuid,
    '92000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM project.revisions
WHERE tenant_id IN (
    '91000000-0000-7000-8000-000000000000'::uuid,
    '92000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM project.projects
WHERE tenant_id IN (
    '91000000-0000-7000-8000-000000000000'::uuid,
    '92000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM auth.tenants
WHERE id IN (
    '91000000-0000-7000-8000-000000000000'::uuid,
    '92000000-0000-7000-8000-000000000000'::uuid
);

INSERT INTO auth.tenants (id, tenant_code, name)
VALUES
    ('91000000-0000-7000-8000-000000000000', 'ROLE-CERT-A', 'Runtime Role Domain Tenant A'),
    ('92000000-0000-7000-8000-000000000000', 'ROLE-CERT-B', 'Runtime Role Domain Tenant B');

INSERT INTO project.projects (
    id, tenant_id, project_code, project_name, project_type
)
VALUES (
    '91000000-0000-7000-8000-000000000001',
    '91000000-0000-7000-8000-000000000000',
    'ROLE-CERT-PROJECT-A',
    'Runtime Role Domain Project A',
    'CERTIFICATION'
);

INSERT INTO project.revisions (
    id, tenant_id, project_id, revision_no, title, status
)
VALUES (
    '91000000-0000-7000-8000-000000000002',
    '91000000-0000-7000-8000-000000000000',
    '91000000-0000-7000-8000-000000000001',
    1,
    'Runtime Role Domain Revision A',
    'APPROVED'
);

INSERT INTO document.files (
    id, tenant_id, project_id, file_name, original_file_name,
    file_type, mime_type, size_bytes, storage_key, sha256_hash
)
VALUES (
    '91000000-0000-7000-8000-000000000003',
    '91000000-0000-7000-8000-000000000000',
    '91000000-0000-7000-8000-000000000001',
    'runtime-role-source.pdf',
    'runtime-role-source.pdf',
    'PDF',
    'application/pdf',
    1,
    'runtime-role-domain/source.pdf',
    repeat('9', 64)
);

INSERT INTO document.file_versions (
    id, tenant_id, project_id, file_id, version_no,
    storage_key, file_hash, source_system
)
VALUES (
    '91000000-0000-7000-8000-000000000004',
    '91000000-0000-7000-8000-000000000000',
    '91000000-0000-7000-8000-000000000001',
    '91000000-0000-7000-8000-000000000003',
    1,
    'runtime-role-domain/source-v1.pdf',
    repeat('9', 64),
    'RUNTIME_ROLE_CERTIFICATION'
);

BEGIN;
SET LOCAL ROLE app_runtime;
SELECT set_config(
    'app.tenant_id',
    '91000000-0000-7000-8000-000000000000',
    true
);

INSERT INTO workflow.erv_design_runs (
    id,
    tenant_id,
    project_id,
    project_revision_id,
    source_file_version_id
)
VALUES (
    '91000000-0000-7000-8000-000000000005',
    '91000000-0000-7000-8000-000000000000',
    '91000000-0000-7000-8000-000000000001',
    '91000000-0000-7000-8000-000000000002',
    '91000000-0000-7000-8000-000000000004'
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM workflow.erv_design_runs
        WHERE id = '91000000-0000-7000-8000-000000000005'::uuid
    ) THEN
        RAISE EXCEPTION 'APP_RUNTIME_WORKFLOW_INSERT_FAILED';
    END IF;
END
$$;
COMMIT;

BEGIN;
SET LOCAL ROLE app_runtime;
SELECT set_config(
    'app.tenant_id',
    '92000000-0000-7000-8000-000000000000',
    true
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM workflow.erv_design_runs
        WHERE id = '91000000-0000-7000-8000-000000000005'::uuid
    ) THEN
        RAISE EXCEPTION 'TENANT_B_CAN_READ_TENANT_A_WORKFLOW';
    END IF;
END
$$;
ROLLBACK;

DELETE FROM workflow.erv_design_runs
WHERE tenant_id IN (
    '91000000-0000-7000-8000-000000000000'::uuid,
    '92000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM document.file_versions
WHERE tenant_id IN (
    '91000000-0000-7000-8000-000000000000'::uuid,
    '92000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM document.files
WHERE tenant_id IN (
    '91000000-0000-7000-8000-000000000000'::uuid,
    '92000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM project.revisions
WHERE tenant_id IN (
    '91000000-0000-7000-8000-000000000000'::uuid,
    '92000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM project.projects
WHERE tenant_id IN (
    '91000000-0000-7000-8000-000000000000'::uuid,
    '92000000-0000-7000-8000-000000000000'::uuid
);

DELETE FROM auth.tenants
WHERE id IN (
    '91000000-0000-7000-8000-000000000000'::uuid,
    '92000000-0000-7000-8000-000000000000'::uuid
);

SELECT 'RUNTIME_ROLE_DOMAIN_COMPLETION_CERTIFIED' AS result;
