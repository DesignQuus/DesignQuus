-- Official-source metadata only.
-- No legal ventilation rates are inserted by this migration.
-- Production numerical parameters require verified source-content review.

BEGIN;

-- Example tenant-scoped insertion pattern:
-- Replace :tenant_id at deployment time.

INSERT INTO compliance.authoritative_sources (
    tenant_id,
    source_code,
    title,
    authority,
    source_type,
    effective_from,
    source_status,
    official_locator,
    metadata_json
)
VALUES
(
    :tenant_id,
    'KDS-31-25-20-2026',
    'KDS 31 25 20:2026 환기설비 설계기준',
    '국가건설기준센터 / 한국건설기술연구원',
    'KDS',
    DATE '2026-02-23',
    'METADATA_ONLY',
    'KCSC KDS 31 mechanical design standards list',
    '{"content_policy":"REQUIRES_APPROVED_SOURCE_CONTENT_IMPORT"}'::jsonb
),
(
    :tenant_id,
    'BLDG-EQUIP-RULE-2025-10-31',
    '건축물의 설비기준 등에 관한 규칙',
    '국토교통부',
    'ENFORCEMENT_RULE',
    DATE '2025-10-31',
    'METADATA_ONLY',
    '국가법령정보센터 법령 ID 006188',
    '{"related_clauses":["제11조","별표 1의5","별표 1의6"]}'::jsonb
),
(
    :tenant_id,
    'IAQ-ENFORCEMENT-DECREE-2026-04-16',
    '실내공기질 관리법 시행령',
    '환경부',
    'ENFORCEMENT_DECREE',
    DATE '2026-04-16',
    'METADATA_ONLY',
    '국가법령정보센터 법령 ID 005137',
    '{"usage":"APPLICABILITY_METADATA_ONLY"}'::jsonb
)
ON CONFLICT DO NOTHING;

COMMIT;
