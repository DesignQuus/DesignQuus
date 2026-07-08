import { AppShell } from '../../components/app-shell';
import { StatusBadge } from '../../components/status-badge';
import { pipelineSteps } from '../../lib/demo-data';

const details = [
  'PDF/DWG 원본 보존·SHA-256·Revision',
  'AI Extraction + CAD Layer/Polyline/Text',
  'Exact Geometry·Unit·m²·Evidence',
  '시행일·조건·Source·Parameter Gate',
  '결정론적 Calculation Engine',
  'Canonical Catalog·Hard Filter·Ranking',
  'Design BOM·Evidence·Version',
  'BLOCKER 0건 이후 Expert Approval',
];

export default function PipelinePage() {
  return (
    <AppShell eyebrow="SYSTEM INTEGRATION" title="도면 → 승인 End-to-End Pipeline">
      <section className="panel panelWide">
        <div className="e2eFlow">
          {pipelineSteps.map((step, index) => (
            <article className="e2eStep" key={step}>
              <div className="stepIndex">{index + 1}</div>
              <div>
                <h2>{step}</h2>
                <p>{details[index]}</p>
              </div>
              <StatusBadge status={index < 7 ? 'READY' : 'GATED'} />
            </article>
          ))}
        </div>
      </section>

      <section className="threeCol">
        <article className="panel">
          <p className="sectionLabel">DATABASE</p>
          <h2>PostgreSQL 18 + PostGIS 3.6</h2>
          <p className="bodyCopy">Migration manifest와 schema_migrations를 사용해 재실행 가능한 배포 흐름을 구성했습니다.</p>
        </article>
        <article className="panel">
          <p className="sectionLabel">APPLICATION</p>
          <h2>NestJS 11 + Next.js 16</h2>
          <p className="bodyCopy">API와 Web을 각각 멀티스테이지 프로덕션 이미지로 빌드합니다.</p>
        </article>
        <article className="panel">
          <p className="sectionLabel">QUALITY GATE</p>
          <h2>Build · Test · DB Smoke</h2>
          <p className="bodyCopy">Python 엔진 테스트, TypeScript 빌드, PostGIS 함수 확인 후 서비스가 시작됩니다.</p>
        </article>
      </section>
    </AppShell>
  );
}
