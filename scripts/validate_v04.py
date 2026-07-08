from pathlib import Path
import json, re, subprocess, sys, yaml

ROOT = Path(__file__).resolve().parents[1]
required = [
  'database/migrations/011_v04_drawing_review.sql',
  'apps/web/components/pdf-plan-viewer.tsx',
  'apps/api/src/modules/document/infrastructure/postgres-space-promotion.repository.ts',
  'workers/ai-worker/drawing/adapter.py',
  'tests/fixtures/drawing-recognition-v04.json',
]
missing = [x for x in required if not (ROOT/x).exists()]
assert not missing, missing

spec = yaml.safe_load((ROOT/'openapi/openapi.yaml').read_text(encoding='utf-8'))
assert spec['openapi'] == '3.2.0'
assert '/v1/file-versions/{fileVersionId}/content' in spec['paths']
assert '/v1/import-jobs/{jobId}/promote-spaces' in spec['paths']

migration = (ROOT/'database/migrations/011_v04_drawing_review.sql').read_text(encoding='utf-8')
assert 'PAGE_NORMALIZED' in migration
assert 'drawing_geometry' in migration
assert 'document.ai_adapter_runs' in migration

web_pkg = json.loads((ROOT/'apps/web/package.json').read_text(encoding='utf-8'))
assert web_pkg['dependencies']['pdfjs-dist'] == '6.1.200'

commands = [
  [sys.executable, '-m', 'unittest', 'discover', '-s', str(ROOT/'workers/calc-worker/tests'), '-p', 'test_*.py'],
  [sys.executable, '-m', 'unittest', 'discover', '-s', str(ROOT/'workers/ai-worker/tests'), '-p', 'test_*.py'],
  [sys.executable, str(ROOT/'tests/integration/test_drawing_review_promotion_offline.py')],
]
for command in commands:
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stdout); print(result.stderr)
        raise SystemExit('Test failed')

print('OK')
print('OpenAPI paths:', len(spec['paths']))
print('PDF.js:', web_pkg['dependencies']['pdfjs-dist'])
print('Drawing adapter tests: passed')
print('Promotion offline integration: passed')
