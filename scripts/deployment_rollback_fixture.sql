\set ON_ERROR_STOP on

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

SELECT 'DEPLOYMENT_ROLLBACK_FIXTURE_READY' AS result;
