import { Injectable } from '@nestjs/common';
import { TenantTransaction } from '../../../database/tenant-transaction';
import { ImportJobCreated, ImportJobRepository } from '../application/import-job.repository';

@Injectable()
export class PostgresImportJobRepository extends ImportJobRepository {
  constructor(private readonly tx: TenantTransaction) { super(); }

  create(input: {
    tenantId: string;
    projectId: string;
    projectRevisionId: string;
    sourceFileVersionId: string;
    importType: 'DRAWING_AI' | 'CAD_OBJECT' | 'IFC' | 'OCR';
    idempotencyKey?: string;
  }): Promise<ImportJobCreated> {
    return this.tx.run(input.tenantId, async (client) => {
      if (input.idempotencyKey) {
        const existing = await client.query<{ import_job_id: string; job_id: string }>(
          `SELECT ij.id AS import_job_id, j.id AS job_id
           FROM document.import_jobs ij
           JOIN ops.jobs j ON (j.payload->>'importJobId') = ij.id::text
           WHERE ij.tenant_id = $1 AND ij.idempotency_key = $2
           ORDER BY ij.created_at DESC LIMIT 1`,
          [input.tenantId, input.idempotencyKey],
        );
        if (existing.rowCount) {
          return { importJobId: existing.rows[0].import_job_id, jobId: existing.rows[0].job_id, status: 'QUEUED' };
        }
      }

      const importJob = await client.query<{ id: string }>(
        `INSERT INTO document.import_jobs (
           tenant_id, project_id, project_revision_id, source_file_version_id,
           import_type, status, idempotency_key
         ) VALUES ($1,$2,$3,$4,$5,'QUEUED',$6)
         RETURNING id`,
        [input.tenantId, input.projectId, input.projectRevisionId, input.sourceFileVersionId, input.importType, input.idempotencyKey ?? null],
      );
      const importJobId = importJob.rows[0].id;
      const job = await client.query<{ id: string }>(
        `INSERT INTO ops.jobs (
           tenant_id, project_id, project_revision_id, job_type, payload,
           idempotency_key, status
         ) VALUES ($1,$2,$3,'DRAWING_AI_ANALYZE',$4::jsonb,$5,'QUEUED')
         RETURNING id`,
        [
          input.tenantId, input.projectId, input.projectRevisionId,
          JSON.stringify({ importJobId, sourceFileVersionId: input.sourceFileVersionId, importType: input.importType }),
          input.idempotencyKey ? `ops:${input.idempotencyKey}` : null,
        ],
      );
      return { importJobId, jobId: job.rows[0].id, status: 'QUEUED' };
    });
  }
}
