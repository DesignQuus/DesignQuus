import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantTransaction } from '../../../database/tenant-transaction';
import { SpacePromotionRepository } from '../application/space-promotion.repository';

interface RoomRow {
  id: string;
  normalized_value: string | null;
  source_page: number | null;
  normalized_geometry: Record<string, unknown> | null;
  attributes: Record<string, unknown>;
}

@Injectable()
export class PostgresSpacePromotionRepository extends SpacePromotionRepository {
  constructor(private readonly tx: TenantTransaction) { super(); }

  promoteReviewedRooms(input: {
    tenantId: string;
    importJobId: string;
    floorId: string;
    createdBy?: string;
  }) {
    return this.tx.run(input.tenantId, async (client) => {
      const job = await client.query<{ project_id: string; project_revision_id: string }>(
        `SELECT project_id, project_revision_id
         FROM document.import_jobs WHERE id = $1`,
        [input.importJobId],
      );
      if (!job.rowCount) throw new NotFoundException('Import job not found');

      const floor = await client.query<{ id: string }>(
        `SELECT id FROM model.floors
         WHERE id = $1 AND project_revision_id = $2`,
        [input.floorId, job.rows[0].project_revision_id],
      );
      if (!floor.rowCount) throw new BadRequestException('Floor does not belong to project revision');

      const rooms = await client.query<RoomRow>(
        `SELECT e.id, e.normalized_value, e.source_page,
                e.normalized_geometry, e.attributes
         FROM document.extractions e
         WHERE e.import_job_id = $1
           AND e.object_type = 'ROOM'
           AND e.review_status IN ('ACCEPTED','CORRECTED')
           AND e.coordinate_space = 'PAGE_NORMALIZED'
           AND e.geometry_kind IN ('RECT','POLYGON')
           AND e.normalized_geometry IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM document.promotion_items pi WHERE pi.extraction_id = e.id
           )
         ORDER BY e.source_page NULLS LAST, e.created_at, e.id`,
        [input.importJobId],
      );
      if (!rooms.rowCount) throw new BadRequestException('No reviewed ROOM extractions eligible for promotion');

      const run = await client.query<{ id: string }>(
        `INSERT INTO document.promotion_runs (
           tenant_id, project_id, project_revision_id, import_job_id,
           promotion_type, floor_id, strategy
         ) VALUES ($1,$2,$3,$4,'SPACES',$5,'REVIEWED_ROOMS_V1')
         RETURNING id`,
        [input.tenantId, job.rows[0].project_id, job.rows[0].project_revision_id, input.importJobId, input.floorId],
      );

      const spaceIds: string[] = [];
      for (const room of rooms.rows) {
        const attrs = room.attributes ?? {};
        const areaRaw = attrs['area_m2'];
        const area = typeof areaRaw === 'number' && Number.isFinite(areaRaw) && areaRaw >= 0 ? areaRaw : null;
        const spaceType = typeof attrs['space_type_code'] === 'string' ? attrs['space_type_code'] : 'UNCLASSIFIED';
        const suffix = room.id.replaceAll('-', '').slice(0, 10).toUpperCase();
        const spaceCode = `AUTO-${suffix}`;
        const name = room.normalized_value?.trim() || `AI Room ${suffix}`;

        const inserted = await client.query<{ id: string }>(
          `INSERT INTO model.spaces (
             tenant_id, project_id, project_revision_id, floor_id,
             space_code, space_name, space_type_code, area_m2,
             drawing_geometry, source_page, source_extraction_id,
             created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now())
           RETURNING id`,
          [
            input.tenantId, job.rows[0].project_id, job.rows[0].project_revision_id,
            input.floorId, spaceCode, name, spaceType, area,
            room.normalized_geometry, room.source_page, room.id,
          ],
        );
        const spaceId = inserted.rows[0].id;
        spaceIds.push(spaceId);
        await client.query(
          `INSERT INTO document.promotion_items (
             tenant_id, promotion_run_id, extraction_id, target_type, target_id
           ) VALUES ($1,$2,$3,'SPACE',$4)`,
          [input.tenantId, run.rows[0].id, room.id, spaceId],
        );
      }

      await client.query(
        `UPDATE document.promotion_runs
         SET status = 'COMPLETED', promoted_count = $2, completed_at = now()
         WHERE id = $1`,
        [run.rows[0].id, spaceIds.length],
      );

      return { promotionRunId: run.rows[0].id, promotedCount: spaceIds.length, spaceIds };
    });
  }
}
