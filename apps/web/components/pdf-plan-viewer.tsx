'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type NormalizedGeometry =
  | { type: 'RECT'; x: number; y: number; width: number; height: number }
  | { type: 'POLYGON'; points: [number, number][] }
  | { type: 'POINT'; x: number; y: number }
  | { type: 'POLYLINE'; points: [number, number][] };

export type OverlayItem = {
  id: string;
  label: string;
  confidenceScore: number;
  reviewStatus: string;
  sourcePage: number | null;
  normalizedGeometry: NormalizedGeometry | null;
};

function pointsToSvg(points: [number, number][]): string {
  return points.map(([x, y]) => `${x * 100},${y * 100}`).join(' ');
}

export function PdfPlanViewer({
  fileUrl,
  tenantId,
  pageNumber,
  items,
  selectedId,
  onSelect,
}: {
  fileUrl: string;
  tenantId: string;
  pageNumber: number;
  items: OverlayItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [status, setStatus] = useState('PDF 로딩 중');

  useEffect(() => {
    let cancelled = false;
    let loadingTask: any = null;

    async function renderPdf() {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      loadingTask = pdfjs.getDocument({
        url: fileUrl,
        httpHeaders: { 'x-tenant-id': tenantId },
        withCredentials: false,
      });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const targetWidth = Math.min(1200, Math.max(700, window.innerWidth * 0.55));
      const viewport = page.getViewport({ scale: targetWidth / baseViewport.width });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas context unavailable');
      const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
      await page.render({ canvasContext: context, transform, viewport }).promise;
      if (!cancelled) {
        setSize({ width: viewport.width, height: viewport.height });
        setStatus(`PDF ${pageNumber}페이지`);
      }
    }

    renderPdf().catch((error: Error) => setStatus(`PDF 오류: ${error.message}`));
    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [fileUrl, tenantId, pageNumber]);

  const visible = useMemo(
    () => items.filter((item) => item.sourcePage === pageNumber && item.normalizedGeometry),
    [items, pageNumber],
  );

  return (
    <div className="pdfViewerShell">
      <div className="viewerStatus">{status} · Overlay {visible.length}건</div>
      <div className="pdfStage" style={{ width: size.width, height: size.height }}>
        <canvas ref={canvasRef} className="pdfCanvas" />
        <svg className="overlaySvg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {visible.map((item) => {
            const g = item.normalizedGeometry!;
            const selected = item.id === selectedId;
            const className = `overlayShape ${selected ? 'selectedOverlay' : ''} ${item.reviewStatus.toLowerCase()}`;
            if (g.type === 'RECT') {
              return <rect key={item.id} x={g.x * 100} y={g.y * 100} width={g.width * 100} height={g.height * 100} className={className} onClick={() => onSelect(item.id)} />;
            }
            if (g.type === 'POLYGON') {
              return <polygon key={item.id} points={pointsToSvg(g.points)} className={className} onClick={() => onSelect(item.id)} />;
            }
            if (g.type === 'POLYLINE') {
              return <polyline key={item.id} points={pointsToSvg(g.points)} className={className} fill="none" onClick={() => onSelect(item.id)} />;
            }
            return <circle key={item.id} cx={g.x * 100} cy={g.y * 100} r="1.2" className={className} onClick={() => onSelect(item.id)} />;
          })}
        </svg>
      </div>
    </div>
  );
}
