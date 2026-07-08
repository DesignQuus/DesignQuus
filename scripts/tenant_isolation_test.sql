\set ON_ERROR_STOP on

DELETE FROM project.projects
WHERE id IN (
    '10000000-0000-7000-8000-000000000001'::uuid,
    '20000000-0000-7000-8000-000000000001'::uuid,
    '30000000-0000-7000-8000-000000000001'::uuid
);

DELETE FROM auth.tenants
WHERE id IN (
    '10000000-0000-7000-8000-000000000000'::uuid,
    '20000000-0000-7000-8000-000000000000'::uuid
);

INSERT INTO auth.tenants (id, tenant_code, name)
VALUES
    ('10000000-0000-7000-8000-000000000000', 'RLS-CERT-A', 'RLS Certification Tenant A'),
    ('20000000-0000-7000-8000-000000000000', 'RLS-CERT-B', 'RLS Certification Tenant B');

BEGIN;
SET LOCAL ROLE app_runtime;
SELECT set_config(
    'app.tenant_id',
    '10000000-0000-7000-8000-000000000000',
    true
);
INSERT INTO project.projects (
    id,
    tenant_id,
    project_code,
    project_name,
    project_type
)
VALUES (
    '10000000-0000-7000-8000-000000000001',
    '10000000-0000-7000-8000-000000000000',
    'RLS-CERT-A-PROJECT',
    'Tenant A Project',
    'CERTIFICATION'
);
COMMIT;

BEGIN;
SET LOCAL ROLE app_runtime;
SELECT set_config(
    'app.tenant_id',
    '20000000-0000-7000-8000-000000000000',
    true
);
INSERT INTO project.projects (
    id,
    tenant_id,
    project_code,
    project_name,
    project_type
)
VALUES (
    '20000000-0000-7000-8000-000000000001',
    '20000000-0000-7000-8000-000000000000',
    'RLS-CERT-B-PROJECT',
    'Tenant B Project',
    'CERTIFICATION'
);
COMMIT;

BEGIN;
SET LOCAL ROLE app_runtime;
SELECT set_config(
    'app.tenant_id',
    '10000000-0000-7000-8000-000000000000',
    true
);

DO $$
DECLARE
    visible_projects integer;
BEGIN
    SELECT count(*)
      INTO visible_projects
      FROM project.projects
     WHERE project_code LIKE 'RLS-CERT-%';

    IF visible_projects <> 1 THEN
        RAISE EXCEPTION
            'TENANT_A_READ_ISOLATION_FAILED: visible_projects=%',
            visible_projects;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM project.projects
         WHERE id = '20000000-0000-7000-8000-000000000001'::uuid
    ) THEN
        RAISE EXCEPTION 'TENANT_A_CAN_READ_TENANT_B';
    END IF;

    BEGIN
        INSERT INTO project.projects (
            id,
            tenant_id,
            project_code,
            project_name,
            project_type
        )
        VALUES (
            '30000000-0000-7000-8000-000000000001',
            '20000000-0000-7000-8000-000000000000',
            'RLS-CERT-CROSS-TENANT-WRITE',
            'Cross Tenant Write Must Fail',
            'CERTIFICATION'
        );

        RAISE EXCEPTION 'CROSS_TENANT_WRITE_WAS_NOT_BLOCKED';
    EXCEPTION
        WHEN insufficient_privilege THEN
            NULL;
    END;
END
$$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE app_runtime;
SELECT set_config(
    'app.tenant_id',
    '20000000-0000-7000-8000-000000000000',
    true
);

DO $$
DECLARE
    visible_projects integer;
BEGIN
    SELECT count(*)
      INTO visible_projects
      FROM project.projects
     WHERE project_code LIKE 'RLS-CERT-%';

    IF visible_projects <> 1 THEN
        RAISE EXCEPTION
            'TENANT_B_READ_ISOLATION_FAILED: visible_projects=%',
            visible_projects;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM project.projects
         WHERE id = '10000000-0000-7000-8000-000000000001'::uuid
    ) THEN
        RAISE EXCEPTION 'TENANT_B_CAN_READ_TENANT_A';
    END IF;
END
$$;
ROLLBACK;

DELETE FROM project.projects
WHERE id IN (
    '10000000-0000-7000-8000-000000000001'::uuid,
    '20000000-0000-7000-8000-000000000001'::uuid,
    '30000000-0000-7000-8000-000000000001'::uuid
);

DELETE FROM auth.tenants
WHERE id IN (
    '10000000-0000-7000-8000-000000000000'::uuid,
    '20000000-0000-7000-8000-000000000000'::uuid
);

SELECT 'TENANT_ISOLATION_CERTIFIED' AS result;
