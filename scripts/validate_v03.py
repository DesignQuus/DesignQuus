from pathlib import Path
import json, re, subprocess, sys, yaml

ROOT = Path(__file__).resolve().parents[1]

required = [
  'docker-compose.yml',
  'database/migrations/009_v03_integration.sql',
  'apps/api/src/database/tenant-transaction.ts',
  'apps/api/src/modules/document/presentation/document.controller.ts',
  'apps/api/src/modules/document/infrastructure/postgres-document.repository.ts',
  'apps/api/src/modules/document/infrastructure/postgres-import-job.repository.ts',
  'apps/api/src/modules/erv-design/infrastructure/postgres-erv-design.repository.ts',
  'apps/web/app/review/[jobId]/review-client.tsx',
  'tests/integration/test_erv_workflow_offline.py',
]
missing = [p for p in required if not (ROOT / p).exists()]
assert not missing, missing

# SQL structure
sql = (ROOT / 'database/migrations/009_v03_integration.sql').read_text(encoding='utf-8')
assert len(re.findall(r'CREATE TABLE IF NOT EXISTS document\.', sql)) == 2
assert 'idempotency_key' in sql

# Repository safety
repo = (ROOT / 'apps/api/src/modules/document/infrastructure/postgres-document.repository.ts').read_text(encoding='utf-8')
assert '$1' in repo and '$11' in repo
assert 'TenantTransaction' in repo
assert 'string concatenat' not in repo.lower()

tx = (ROOT / 'apps/api/src/database/tenant-transaction.ts').read_text(encoding='utf-8')
for token in ['BEGIN', 'set_config', 'COMMIT', 'ROLLBACK', 'client.release']:
    assert token in tx

# Upload and UI essentials
controller = (ROOT / 'apps/api/src/modules/document/presentation/document.controller.ts').read_text(encoding='utf-8')
for token in ['FileInterceptor', 'MaxFileSizeValidator', 'idempotency-key', 'TenantId', "@Post('import-jobs')"]:
    assert token in controller
tenant_decorator = (ROOT / 'apps/api/src/common/tenant.ts').read_text(encoding='utf-8')
assert 'x-tenant-id' in tenant_decorator
storage = (ROOT / 'apps/api/src/storage/storage.service.ts').read_text(encoding='utf-8')
assert 'createReadStream' in storage and 'readFile' not in storage

ui = (ROOT / 'apps/web/app/review/[jobId]/review-client.tsx').read_text(encoding='utf-8')
for token in ['Confidence', 'ACCEPTED', 'REJECTED', 'CORRECTED', 'Bounding Box']:
    assert token in ui

# OpenAPI
spec = yaml.safe_load((ROOT / 'openapi/openapi.yaml').read_text(encoding='utf-8'))
assert spec['openapi'] == '3.2.0'
for path in ['/v1/files/upload', '/v1/import-jobs/{jobId}/extractions', '/v1/extractions/{extractionId}/review']:
    assert path in spec['paths']

# Python unit + offline integration tests
commands = [
    [sys.executable, '-m', 'unittest', 'discover', '-s', str(ROOT / 'workers/calc-worker/tests'), '-p', 'test_*.py'],
    [sys.executable, '-m', 'unittest', 'discover', '-s', str(ROOT / 'tests/integration'), '-p', 'test_*.py'],
]
for command in commands:
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)
        raise SystemExit('Tests failed')

print('OK')
print('OpenAPI paths:', len(spec['paths']))
print('v0.3 SQL tables added: 2')
print('Calculation/selection unit tests: passed')
print('Offline ERV workflow integration tests: passed')
print('Docker DB E2E: included, not executed by validator')
