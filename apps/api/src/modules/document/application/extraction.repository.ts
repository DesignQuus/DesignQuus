export type ReviewDecision = 'ACCEPTED' | 'REJECTED' | 'CORRECTED';

export type NormalizedGeometry =
  | { type: 'RECT'; x: number; y: number; width: number; height: number }
  | { type: 'POLYGON'; points: [number, number][] }
  | { type: 'POINT'; x: number; y: number }
  | { type: 'POLYLINE'; points: [number, number][] };

export interface ExtractionView {
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
}

export abstract class ExtractionRepository {
  abstract listByImportJob(tenantId: string, importJobId: string): Promise<ExtractionView[]>;
  abstract review(input: {
    tenantId: string;
    extractionId: string;
    decision: ReviewDecision;
    correctedValue?: string;
    reviewedBy?: string;
  }): Promise<ExtractionView>;
}
