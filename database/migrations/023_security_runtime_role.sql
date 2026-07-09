BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime'
    ) THEN
        CREATE ROLE app_runtime
            NOLOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOREPLICATION
            NOINHERIT;
    END IF;
END
$$;

DO $$
BEGIN
    EXECUTE format('GRANT app_runtime TO %I', current_user);
END
$$;

GRANT USAGE ON SCHEMA
    auth,
    project,
    document,
    model,
    compliance,
    calculation,
    approval,
    ops,
    audit,
    cad,
    catalog
TO app_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA
    auth,
    project,
    document,
    model,
    compliance,
    calculation,
    approval,
    ops,
    audit,
    cad,
    catalog
TO app_runtime;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA
    auth,
    project,
    document,
    model,
    compliance,
    calculation,
    approval,
    ops,
    audit,
    cad,
    catalog
TO app_runtime;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA
    auth,
    project,
    document,
    model,
    compliance,
    calculation,
    approval,
    ops,
    audit,
    cad,
    catalog
TO app_runtime;

DO $$
DECLARE
    target record;
BEGIN
    FOR target IN
        SELECT DISTINCT c.table_schema, c.table_name
        FROM information_schema.columns c
        JOIN pg_tables t
          ON t.schemaname = c.table_schema
         AND t.tablename = c.table_name
        WHERE c.column_name = 'tenant_id'
          AND c.table_schema IN (
              'auth', 'project', 'document', 'model', 'compliance',
              'calculation', 'approval', 'ops', 'audit', 'cad', 'catalog'
          )
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',
            target.table_schema,
            target.table_name
        );
    END LOOP;
END
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA
    auth,
    project,
    document,
    model,
    compliance,
    calculation,
    approval,
    ops,
    audit,
    cad,
    catalog
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA
    auth,
    project,
    document,
    model,
    compliance,
    calculation,
    approval,
    ops,
    audit,
    cad,
    catalog
GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA
    auth,
    project,
    document,
    model,
    compliance,
    calculation,
    approval,
    ops,
    audit,
    cad,
    catalog
GRANT EXECUTE ON FUNCTIONS TO app_runtime;

COMMIT;
