import { Injectable } from '@nestjs/common';
import { TenantTransaction } from '../../../database/tenant-transaction';
import {
  CreateUploadedDocumentInput,
  DocumentRepository,
  UploadedDocumentResult,
} from '../application/document.repository';

@Injectable()
export class PostgresDocumentRepository extends DocumentRepository {
  constructor(private readonly tx: TenantTransaction) { super(); }

  async getFileVersionContent(tenantId: string, fileVersionId: string) {
    return this.tx.run(tenantId, async (client) => {
      const result = await client.query<{
        file_version_id: string; storage_key: string; original_file_name: string;
        mime_type: string; size_bytes: string;
      }>(
        `SELECT fv.id AS file_version_id, fv.storage_key, f.original_file_name,
                f.mime_type, f.size_bytes
         FROM document.file_versions fv
         JOIN document.files f ON f.id = fv.file_id
         WHERE fv.id = $1`,
        [fileVersionId],
      );
      if (!result.rowCount) return null;
      const row = result.rows[0];
      return {
        fileVersionId: row.file_version_id, storageKey: row.storage_key,
        originalFileName: row.original_file_name, mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
      };
    });
  }

  async createUploadedDocument(input: CreateUploadedDocumentInput): Promise<UploadedDocumentResult> {
    return this.tx.run(input.tenantId, async (client) => {
      if (input.idempotencyKey) {
        const existing = await client.query<{ file_id: string; file_version_id: string; version_no: number }>(
          `SELECT f.id AS file_id, fv.id AS file_version_id, fv.version_no
           FROM document.files f
           JOIN document.file_versions fv ON fv.file_id = f.id
           WHERE f.tenant_id = $1 AND f.idempotency_key = $2
           ORDER BY fv.version_no DESC LIMIT 1`,
          [input.tenantId, input.idempotencyKey],
        );
        if (existing.rowCount) {
          const row = existing.rows[0];
          return { fileId: row.file_id, fileVersionId: row.file_version_id, versionNo: row.version_no };
        }
      }

      const file = await client.query<{ id: string }>(
        `INSERT INTO document.files (
           tenant_id, project_id, project_revision_id, file_name, original_file_name,
           file_type, mime_type, size_bytes, storage_key, sha256_hash, idempotency_key
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id`,
        [
          input.tenantId, input.projectId, input.projectRevisionId, input.fileName,
          input.originalFileName, input.fileType, input.mimeType, input.sizeBytes,
          input.storageKey, input.sha256Hash, input.idempotencyKey ?? null,
        ],
      );

      const fileId = file.rows[0].id;
      const version = await client.query<{ id: string; version_no: number }>(
        `INSERT INTO document.file_versions (
           tenant_id, project_id, file_id, version_no, storage_key, file_hash, source_system
         ) VALUES ($1,$2,$3,1,$4,$5,'UPLOAD_API')
         RETURNING id, version_no`,
        [input.tenantId, input.projectId, fileId, input.storageKey, input.sha256Hash],
      );

      return {
        fileId,
        fileVersionId: version.rows[0].id,
        versionNo: version.rows[0].version_no,
      };
    });
  }
}
