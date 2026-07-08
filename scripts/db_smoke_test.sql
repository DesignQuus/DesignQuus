\set ON_ERROR_STOP on

SELECT current_setting('server_version_num')::integer >= 180000 AS postgres_18_or_newer;
SELECT postgis_version() IS NOT NULL AS postgis_available;
SELECT to_regclass('project.projects') IS NOT NULL AS project_table_exists;
SELECT to_regclass('model.spaces') IS NOT NULL AS spaces_table_exists;
SELECT to_regclass('compliance.rule_drafts') IS NOT NULL AS rule_studio_exists;
SELECT to_regclass('catalog.catalog_import_runs') IS NOT NULL AS catalog_import_exists;
SELECT cad.exact_iou(
    ST_GeomFromText('POLYGON((0 0,2 0,2 2,0 2,0 0))'),
    ST_GeomFromText('POLYGON((1 0,3 0,3 2,1 2,1 0))')
) BETWEEN 0.333333 AND 0.333334 AS exact_iou_ok;
