import { AppShell } from '../../components/app-shell';
import { StatusBadge } from '../../components/status-badge';
import { ruleTests } from '../../lib/demo-data';

export default function RuleStudioPage() {
  return (
    <AppShell eyebrow="COMPLIANCE INTELLIGENCE" title="Rule Studio">
      <section className="threeCol">
        <article className="panel">
          <p className="sectionLabel">SOURCE</p>
          <h2>공식 출처</h2>
          <dl className="detailList">
            <div><dt>Source</dt><dd>KDS-31-25-20-2026</dd></div>
            <div><dt>Status</dt><dd><StatusBadge status="METADATA_ONLY" /></dd></div>
            <div><dt>Effective</dt><dd>2026-02-23</dd></div>
          </dl>
          <div className="warningBox">
            원문 수치가 검증되기 전에는 법적 Rule 승인과 운영 계산을 차단합니다.
          </div>
        </article>

        <article className="panel spanTwo">
          <div className="panelTitleRow">
            <div>
              <p className="sectionLabel">DRAFT EDITOR</p>
              <h2>VENT-CONFERENCE-001</h2>
            </div>
            <StatusBadge status="COMPILED" />
          </div>
          <div className="formGrid">
            <label>Rule Name<input readOnly value="회의실 환기설계 기준" /></label>
            <label>Effective From<input readOnly value="2026-02-23" /></label>
            <label>Condition<input readOnly value="space_type_code = CONFERENCE_ROOM" /></label>
            <label>Calculation Method<input readOnly value="MAX_OF" /></label>
          </div>
          <div className="codeCard">
            <code>PER_PERSON · PER_AREA → MAX_OF</code>
          </div>
          <div className="actionRow">
            <button className="secondaryButton">Compile</button>
            <button className="primaryButton">Test Suite 실행</button>
          </div>
        </article>
      </section>

      <section className="panel panelWide">
        <div className="panelTitleRow">
          <div>
            <p className="sectionLabel">TEST CONSOLE</p>
            <h2>Required Cases 4 / 4</h2>
          </div>
          <StatusBadge status="PASSED" />
        </div>
        <div className="dataTable">
          <div className="tableHeader">
            <span>Case</span><span>Expected</span><span>Result</span>
          </div>
          {ruleTests.map((test) => (
            <div className="tableRow" key={test.name}>
              <span><strong>{test.name}</strong><small>{test.detail}</small></span>
              <span>정의된 기대결과</span>
              <span><StatusBadge status={test.status} /></span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
