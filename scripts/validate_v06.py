from pathlib import Path
import json
import re
import subprocess
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]

required = [
  'database/migrations/014_cad_semantics.sql',
  'workers/cad-worker/cad/layer_classifier.py',
  'workers/cad-worker/cad/room_detector.py',
  'workers/cad-worker/cad/text_room_matcher.py',
  'workers/cad-worker/cad/ai_cad_matcher.py',
  'config/cad-layer-classifier.v0.6.json',
  'config/ai-cad-match-policy.v0.6.json',
  'openapi/openapi.yaml',
]
missing = [p for p in required if not (ROOT / p).exists()]
assert not missing, missing

sql = (ROOT / 'database/migrations/014_cad_semantics.sql').read_text(encoding='utf-8')
semantic_tables = len(re.findall(r'CREATE TABLE cad\.', sql))
assert semantic_tables == 7, semantic_tables

spec = yaml.safe_load((ROOT / 'openapi/openapi.yaml').read_text(encoding='utf-8'))
assert spec['openapi'] == '3.2.0'
assert len(spec['paths']) >= 39, len(spec['paths'])
assert '/v1/cad-semantics/ai-cad-match-runs' in spec['paths']

for rel in ['config/cad-layer-classifier.v0.6.json','config/ai-cad-match-policy.v0.6.json']:
    json.loads((ROOT / rel).read_text(encoding='utf-8'))

result = subprocess.run(
    [sys.executable, '-m', 'unittest', 'discover', '-s', str(ROOT/'workers/cad-worker/tests'), '-p', 'test_*.py'],
    capture_output=True,
    text=True,
)
if result.returncode != 0:
    print(result.stdout)
    print(result.stderr)
    raise SystemExit('CAD semantic tests failed')

print('OK')
print('CAD semantic tables:', semantic_tables)
print('OpenAPI paths:', len(spec['paths']))
print(result.stdout.strip() or result.stderr.strip())
