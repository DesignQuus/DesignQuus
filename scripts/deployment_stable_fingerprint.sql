\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

WITH target AS (
    SELECT 'a1000000-0000-7000-8000-000000000000'::uuid AS tenant_id
)
SELECT jsonb_build_object(
    'tenantCount', (
        SELECT count(*)
        FROM auth.tenants t, target x
        WHERE t.id = x.tenant_id
    ),
    'tenantChecksum', (
        SELECT md5(coalesce(string_agg(
            concat_ws('|', t.id::text, t.tenant_code, t.name),
            '||' ORDER BY t.id
        ), ''))
        FROM auth.tenants t, target x
        WHERE t.id = x.tenant_id
    ),
    'projectCount', (
        SELECT count(*)
        FROM project.projects p, target x
        WHERE p.tenant_id = x.tenant_id
    ),
    'projectChecksum', (
        SELECT md5(coalesce(string_agg(
            concat_ws('|',
                p.id::text,
                p.project_code,
                p.project_name,
                p.project_type,
                p.status
            ),
            '||' ORDER BY p.id
        ), ''))
        FROM project.projects p, target x
        WHERE p.tenant_id = x.tenant_id
    ),
    'revisionCount', (
        SELECT count(*)
        FROM project.revisions r, target x
        WHERE r.tenant_id = x.tenant_id
    ),
    'revisionChecksum', (
        SELECT md5(coalesce(string_agg(
            concat_ws('|',
                r.id::text,
                r.project_id::text,
                r.revision_no::text,
                r.title,
                r.status
            ),
            '||' ORDER BY r.id
        ), ''))
        FROM project.revisions r, target x
        WHERE r.tenant_id = x.tenant_id
    ),
    'postgisAreaProbe', (
        SELECT ST_Area(
            ST_GeomFromText('POLYGON((0 0,8 0,8 4,0 4,0 0))')
        )
    )
)::text;
