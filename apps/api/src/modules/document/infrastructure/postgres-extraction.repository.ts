import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantTransaction } from '../../../database/tenant-transaction';
import {
  ExtractionRepository,
  ExtractionView,
  NormalizedGeometry,
  ReviewDecision,
} from '../application/extraction.repository';

interface ExtractionRow {
  id: string;
  object_type: string;
  raw_value: string | null;
  normalized_value: string | null;
  confidence_score: string;
  review_status: string;
  source_page: number | null;
  source_layer: string | null;
  coordinate_space: string | null;
  geometry_kind: string | null;
  normalized_geometry: NormalizedGeometry | null;
  attributes: Record<string, unknown>;
}

const columns = `id, object_type, raw_value, normalized_value, confidence_score,
                 review_status, source_page, source_layer, coordinate_space,
                 geometry_kind, normalized_geometry, attributes`;

const mapRow = (row: ExtractionRow): ExtractionView => ({
  id: row.id,
  objectType: row.object_type,
  rawValue: row.raw_value,
  normalizedValue: row.normalized_value,
  confidenceScore: Number(row.confidence_score),
  reviewStatus: row.review_status,
  sourcePage: row.source_page,
  sourceLayer: row.source_layer,
  coordinateSpace: row.coordinate_space,
  geometryKind: row.geometry_kind,
  normalizedGeometry: row.normalized_geometry,
  attributes: row.attributes ?? {},
});

@Injectable()
export class PostgresExtractionRepository extends ExtractionRepository {
  constructor(private readonly tx: TenantTransaction) { super(); }

  listByImportJob(tenantId: string, importJobId: string): Promise<ExtractionView[]> {
    return this.tx.run(tenantId, async (client) => {
      const result = await client.query<ExtractionRow>(
        `SELECT ${columns}
         FROM document.extractions
         WHERE import_job_id = $1
         ORDER BY source_page NULLS LAST, created_at, id`,
        [importJobId],
      );
      return result.rows.map(mapRow);
    });
  }

  review(input: {
    tenantId: string;
    extractionId: string;
    decision: ReviewDecision;
    correctedValue?: string;
    reviewedBy?: string;
  }): Promise<ExtractionView> {
    if (input.decision === 'CORRECTED' && !input.correctedValue?.trim()) {
      throw new BadRequestException('correctedValue is required for CORRECTED');
    }

    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<ExtractionRow>(
        `UPDATE document.extractions
         SET review_status = $2,
             normalized_value = CASE WHEN $2 = 'CORRECTED' THEN $3 ELSE normalized_value END,
             reviewed_by = $4,
             reviewed_at = now()
         WHERE id = $1
         RETURNING ${columns}`,
        [input.extractionId, input.decision, input.correctedValue ?? null, input.reviewedBy ?? null],
      );
      if (!result.rowCount) throw new NotFoundException('Extraction not found');
      return mapRow(result.rows[0]);
    });
  }
}
