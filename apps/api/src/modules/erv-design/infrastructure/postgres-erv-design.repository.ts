import { Injectable } from '@nestjs/common';
import { TenantTransaction } from '../../../database/tenant-transaction';
import { ErvDesignRepository } from '../application/erv-design.repository';
import type { ErvDesignRun } from '../domain/erv-design-run';

interface Row {
  id: string;
  project_id: string;
  project_revision_id: string;
  source_file_version_id: string;
  status: ErvDesignRun['status'];
  current_step: string;
  created_at: Date;
}

const mapRow = (row: Row): ErvDesignRun => ({
  id: row.id,
  projectId: row.project_id,
  projectRevisionId: row.project_revision_id,
  sourceFileVersionId: row.source_file_version_id,
  status: row.status,
  currentStep: row.current_step,
  createdAt: row.created_at.toISOString(),
});

@Injectable()
export class PostgresErvDesignRepository extends ErvDesignRepository {
  constructor(private readonly tx: TenantTransaction) { super(); }

  async create(input: {
    tenantId: string;
    projectId: string;
    projectRevisionId: string;
    sourceFileVersionId: string;
  }): Promise<ErvDesignRun> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<Row>(
        `INSERT INTO workflow.erv_design_runs (
           tenant_id, project_id, project_revision_id, source_file_version_id
         ) VALUES ($1,$2,$3,$4)
         RETURNING id, project_id, project_revision_id, source_file_version_id,
                   status, current_step, created_at`,
        [input.tenantId, input.projectId, input.projectRevisionId, input.sourceFileVersionId],
      );
      return mapRow(result.rows[0]);
    });
  }

  async findById(tenantId: string, id: string): Promise<ErvDesignRun | null> {
    return this.tx.run(tenantId, async (client) => {
      const result = await client.query<Row>(
        `SELECT id, project_id, project_revision_id, source_file_version_id,
                status, current_step, created_at
         FROM workflow.erv_design_runs WHERE id = $1`,
        [id],
      );
      return result.rowCount ? mapRow(result.rows[0]) : null;
    });
  }
}
