\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.ai_hvac_runtime_bootstrap (
    check_name text PRIMARY KEY,
    checked_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_hvac_runtime_bootstrap(check_name)
VALUES
    ('POSTGRESQL_18'),
    ('POSTGIS_3_6'),
    ('EXACT_GEOMETRY')
ON CONFLICT DO NOTHING;

SELECT current_setting('server_version_num')::integer >= 180000 AS postgres_18_or_newer;
SELECT postgis_version() IS NOT NULL AS postgis_available;

SELECT (
    ST_Area(
        ST_Intersection(
            ST_GeomFromText('POLYGON((0 0,2 0,2 2,0 2,0 0))'),
            ST_GeomFromText('POLYGON((1 0,3 0,3 2,1 2,1 0))')
        )
    )
    /
    ST_Area(
        ST_Union(
            ST_GeomFromText('POLYGON((0 0,2 0,2 2,0 2,0 0))'),
            ST_GeomFromText('POLYGON((1 0,3 0,3 2,1 2,1 0))')
        )
    )
) BETWEEN 0.333333 AND 0.333334 AS exact_iou_ok;
