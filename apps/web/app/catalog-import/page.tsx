import { AppShell } from '../../components/app-shell';
import { StatusBadge } from '../../components/status-badge';
import { catalogRows } from '../../lib/demo-data';

export default function CatalogImportPage() {
  return (
    <AppShell eyebrow="PRODUCT CONFIGURATION" title="Manufacturer Catalog Import">
      <section className="metricGrid">
        <article className="metricCard"><span>Rows</span><strong>3</strong><small>CSV Source</small></article>
        <article className="metricCard"><span>Valid</span><strong>3</strong><small>Canonical schema</small></article>
        <article className="metricCard"><span>Error</span><strong>0</strong><small>Publish blocker</small></article>
        <article className="metricCard successCard"><span>Status</span><strong>READY</strong><small>Ready to publish</small></article>
      </section>

      <section className="twoCol">
        <article className="panel">
          <p className="sectionLabel">FIELD MAPPING</p>
          <h2>DEMO_ERV_CSV v1</h2>
          <div className="mappingList">
            {[
              ['Model', 'model_code'],
              ['Airflow', 'airflow_m3_h'],
              ['ESP', 'external_static_pressure_pa'],
              ['Power', 'power_input_kw'],
            ].map(([source, target]) => (
              <div key={source}><span>{source}</span><b>→</b><strong>{target}</strong></div>
            ))}
          </div>
        </article>

        <article className="panel">
          <p className="sectionLabel">UNIT NORMALIZATION</p>
          <h2>명시적 변환 규칙</h2>
          <div className="conversionCards">
            <div><strong>10 m³/min</strong><span>→</span><b>600 m³/h</b></div>
            <div><strong>15 mmAq</strong><span>→</span><b>147.10 Pa</b></div>
            <div><strong>350 W</strong><span>→</span><b>0.350 kW</b></div>
          </div>
        </article>
      </section>

      <section className="panel panelWide">
        <div className="panelTitleRow">
          <div>
            <p className="sectionLabel">NORMALIZED PRODUCTS</p>
            <h2>Publish Preview</h2>
          </div>
          <button className="primaryButton">Product Revision 배포</button>
        </div>
        <div className="dataTable catalogTable">
          <div className="tableHeader">
            <span>Model</span><span>Airflow</span><span>ESP</span><span>Power</span><span>Status</span>
          </div>
          {catalogRows.map((row) => (
            <div className="tableRow" key={row.model}>
              <span><strong>{row.model}</strong></span>
              <span>{row.airflow}</span>
              <span>{row.esp}</span>
              <span>{row.power}</span>
              <span><StatusBadge status={row.status} /></span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
