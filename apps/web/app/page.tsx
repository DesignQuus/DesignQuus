import Link from 'next/link';
import { AppShell } from '../components/app-shell';
import { pipelineSteps, ruleTests, catalogRows } from '../lib/demo-data';

export default function HomePage() {
  return (
    <AppShell
      eyebrow="AI HVAC ENGINEERING OS"
      title="설비 엔지니어링 운영 대시보드"
    >
      <section className="metricGrid">
        <article className="metricCard">
          <span>핵심 도메인 테이블</span>
          <strong>66</strong>
          <small>Revision · Rule · Calculation · Catalog</small>
        </article>
        <article className="metricCard">
          <span>OpenAPI 경로</span>
          <strong>63</strong>
          <small>모듈형 API 계약</small>
        </article>
        <article className="metricCard">
          <span>자동 테스트</span>
          <strong>83</strong>
          <small>CAD 45 + Rule/Calc/Catalog 38</small>
        </article>
        <article className="metricCard successCard">
          <span>운영 Gate</span>
          <strong>PASS</strong>
          <small>Rule·Parameter·Expert Approval</small>
        </article>
      </section>

      <section className="panel panelWide">
        <div className="panelTitleRow">
          <div>
            <p className="sectionLabel">END-TO-END FLOW</p>
            <h2>도면에서 전문가 승인까지</h2>
          </div>
          <Link className="primaryLink" href="/pipeline">전체 흐름 보기</Link>
        </div>
        <div className="pipelineStrip">
          {pipelineSteps.map((step, index) => (
            <div className="pipelineNode" key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="twoCol">
        <article className="panel">
          <div className="panelTitleRow">
            <div>
              <p className="sectionLabel">RULE QUALITY</p>
              <h2>Rule Test Console</h2>
            </div>
            <Link className="textLink" href="/rule-studio">열기</Link>
          </div>
          <div className="compactList">
            {ruleTests.map((item) => (
              <div className="listRow" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.detail}</span>
                </div>
                <b className="okText">{item.status}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panelTitleRow">
            <div>
              <p className="sectionLabel">CATALOG PIPELINE</p>
              <h2>제조사 제품 정규화</h2>
            </div>
            <Link className="textLink" href="/catalog-import">열기</Link>
          </div>
          <div className="compactList">
            {catalogRows.map((row) => (
              <div className="listRow" key={row.model}>
                <div>
                  <strong>{row.model}</strong>
                  <span>{row.airflow} · {row.esp} · {row.power}</span>
                </div>
                <b className="okText">{row.status}</b>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
