'use client';

import { useEffect, useMemo, useState } from 'react';
import { PdfPlanViewer, type NormalizedGeometry } from '../../../components/pdf-plan-viewer';

type Extraction = {
  id: string;
  objectType: string;
  rawValue: string | null;
  normalizedValue: string | null;
  confidenceScore: number;
  reviewStatus: string;
  sourcePage: number | null;
  sourceLayer: string | null;
  coordinateSpace: string | null;
  geometryKind: string | null;
  normalizedGeometry: NormalizedGeometry | null;
  attributes: Record<string, unknown>;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/v1';

function confidenceBand(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.95) return 'high';
  if (score >= 0.80) return 'medium';
  return 'low';
}

export function ExtractionReview({
  jobId,
  tenantId,
  fileVersionId,
  floorId,
}: {
  jobId: string;
  tenantId: string;
  fileVersionId: string;
  floorId: string;
}) {
  const [items, setItems] = useState<Extraction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correction, setCorrection] = useState('');
  const [status, setStatus] = useState('불러오는 중...');
  const [pageNumber, setPageNumber] = useState(1);
  const [promotionStatus, setPromotionStatus] = useState('');

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  async function load() {
    if (!tenantId) {
      setStatus('tenantId가 필요합니다.');
      return;
    }
    const response = await fetch(`${API}/import-jobs/${jobId}/extractions`, {
      headers: { 'x-tenant-id': tenantId }, cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Load failed: ${response.status}`);
    const data = await response.json() as Extraction[];
    setItems(data);
    setSelectedId(data[0]?.id ?? null);
    setPageNumber(data[0]?.sourcePage ?? 1);
    setStatus(`${data.length}건 로드`);
  }

  useEffect(() => {
    load().catch((error: Error) => setStatus(error.message));
  }, [jobId, tenantId]);

  async function review(decision: 'ACCEPTED' | 'REJECTED' | 'CORRECTED') {
    if (!selected) return;
    const response = await fetch(`${API}/extractions/${selected.id}/review`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({
        decision,
        correctedValue: decision === 'CORRECTED' ? correction : undefined,
      }),
    });
    if (!response.ok) throw new Error(`Review failed: ${response.status}`);
    const updated = await response.json() as Extraction;
    setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
    setCorrection('');
  }

  async function promoteSpaces() {
    if (!floorId) {
      setPromotionStatus('floorId가 필요합니다.');
      return;
    }
    setPromotionStatus('SPACE 승격 중...');
    const response = await fetch(`${API}/import-jobs/${jobId}/promote-spaces`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({ floorId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setPromotionStatus(payload.message ?? `승격 실패 ${response.status}`);
      return;
    }
    setPromotionStatus(`${payload.promotedCount}개 SPACE 승격 완료`);
  }

  const fileUrl = fileVersionId ? `${API}/file-versions/${fileVersionId}/content` : '';

  return (
    <main className="reviewShell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DRAWING INTELLIGENCE · REVIEW v0.4</p>
          <h1>도면 위에서 AI 결과 검토</h1>
        </div>
        <div className="statusPill">{status}</div>
      </header>

      <section className="workspace">
        <aside className="drawingPanel">
          <div className="panelHeader">
            <strong>PDF 도면 / AI Overlay</strong>
            <span>PAGE_NORMALIZED</span>
          </div>
          {fileUrl ? (
            <PdfPlanViewer
              fileUrl={fileUrl}
              tenantId={tenantId}
              pageNumber={pageNumber}
              items={items.map((item) => ({
                id: item.id,
                label: item.normalizedValue ?? item.rawValue ?? item.objectType,
                confidenceScore: item.confidenceScore,
                reviewStatus: item.reviewStatus,
                sourcePage: item.sourcePage,
                normalizedGeometry: item.normalizedGeometry,
              }))}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
            />
          ) : (
            <div className="drawingPlaceholder"><p>fileVersionId query parameter가 필요합니다.</p></div>
          )}
        </aside>

        <section className="reviewPanel">
          <div className="panelHeader">
            <strong>추출 객체</strong>
            <span>도형 클릭 ↔ 목록 선택 연동</span>
          </div>
          <div className="extractionList">
            {items.map((item) => (
              <button
                key={item.id}
                className={`extractionRow ${selected?.id === item.id ? 'selected' : ''}`}
                onClick={() => { setSelectedId(item.id); setPageNumber(item.sourcePage ?? 1); }}
              >
                <span className={`confidence ${confidenceBand(item.confidenceScore)}`}>
                  {Math.round(item.confidenceScore * 100)}%
                </span>
                <span className="extractionMain">
                  <strong>{item.normalizedValue ?? item.rawValue ?? '값 없음'}</strong>
                  <small>{item.objectType} · {item.reviewStatus} · P{item.sourcePage ?? '-'}</small>
                </span>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="detailCard">
              <div className="detailGrid">
                <label>원본 값<input value={selected.rawValue ?? ''} readOnly /></label>
                <label>정규화 값<input value={selected.normalizedValue ?? ''} readOnly /></label>
                <label>좌표계<input value={selected.coordinateSpace ?? ''} readOnly /></label>
                <label>Geometry<input value={selected.geometryKind ?? ''} readOnly /></label>
              </div>
              <label className="fullLabel">수정 값<input value={correction} onChange={(e) => setCorrection(e.target.value)} placeholder="수정이 필요한 경우 입력" /></label>
              <div className="actions">
                <button className="reject" onClick={() => review('REJECTED')}>거절</button>
                <button className="correct" onClick={() => review('CORRECTED')}>수정 확정</button>
                <button className="accept" onClick={() => review('ACCEPTED')}>승인</button>
              </div>
            </div>
          ) : <p className="empty">추출 객체가 없습니다.</p>}

          <div className="promotionCard">
            <strong>Engineering Core Model 승격</strong>
            <p>검토 완료된 ROOM Geometry를 SPACE로 생성합니다.</p>
            <button className="promoteButton" onClick={promoteSpaces}>검토 ROOM → SPACE 승격</button>
            <small>{promotionStatus}</small>
          </div>
        </section>
      </section>
    </main>
  );
}
