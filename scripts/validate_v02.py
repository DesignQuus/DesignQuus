from pathlib import Path
import json
import re
import subprocess
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]

required = [
    'CLAUDE.md',
    'database/migrations/002_foundation.sql',
    'database/migrations/006_erv_e2e.sql',
    'database/migrations/008_erv_rls.sql',
    'openapi/openapi.yaml',
    'workers/calc-worker/ventilation/calculator.py',
    'workers/calc-worker/selection/erv_selector.py',
    'workflow/erv-design.workflow.yaml',
    'workflow/blocker-policy.yaml',
    'rules/examples/ventilation-demo.rule.json',
    'catalog/sample/erv-products.demo.json',
    'bom/rules/erv-basic.parts.json',
]
missing = [p for p in required if not (ROOT / p).exists()]
assert not missing, f'Missing files: {missing}'

foundation_sql = (ROOT / 'database/migrations/002_foundation.sql').read_text(encoding='utf-8')
foundation_schemas = ['project','document','model','compliance','calculation','approval']
foundation_counts = {s: len(re.findall(rf'CREATE TABLE {s}\.', foundation_sql)) for s in foundation_schemas}
assert sum(foundation_counts.values()) == 23, foundation_counts

erv_sql = (ROOT / 'database/migrations/006_erv_e2e.sql').read_text(encoding='utf-8')
extension_schemas = ['workflow','catalog','bom','validation']
extension_counts = {s: len(re.findall(rf'CREATE TABLE {s}\.', erv_sql)) for s in extension_schemas}
assert sum(extension_counts.values()) == 10, extension_counts

spec = yaml.safe_load((ROOT / 'openapi/openapi.yaml').read_text(encoding='utf-8'))
assert spec['openapi'] == '3.2.0'
assert len(spec['paths']) == 21, len(spec['paths'])
for p in ['/v1/erv-design-runs','/v1/erv-design-runs/{runId}/bom','/v1/erv-design-runs/{runId}/blockers']:
    assert p in spec['paths'], p

for rel in [
    'rules/examples/ventilation-demo.rule.json',
    'catalog/sample/erv-products.demo.json',
    'bom/rules/erv-basic.parts.json',
]:
    json.loads((ROOT / rel).read_text(encoding='utf-8'))

for rel in ['workflow/erv-design.workflow.yaml','workflow/blocker-policy.yaml']:
    yaml.safe_load((ROOT / rel).read_text(encoding='utf-8'))

result = subprocess.run(
    [sys.executable, '-m', 'unittest', 'discover', '-s', str(ROOT / 'workers/calc-worker/tests'), '-p', 'test_*.py'],
    capture_output=True, text=True
)
if result.returncode != 0:
    print(result.stdout)
    print(result.stderr)
    raise SystemExit('Calculation tests failed')

print('OK')
print('Foundation tables:', sum(foundation_counts.values()), foundation_counts)
print('ERV extension tables:', sum(extension_counts.values()), extension_counts)
print('OpenAPI paths:', len(spec['paths']))
print('Calculation tests: passed')
