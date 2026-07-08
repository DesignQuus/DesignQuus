import type { FileVersionContent } from './file-version-content';

export interface CreateUploadedDocumentInput {
  tenantId: string;
  projectId: string;
  projectRevisionId: string;
  fileName: string;
  originalFileName: string;
  fileType: 'DWG' | 'DXF' | 'PDF' | 'IFC' | 'IMAGE';
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  sha256Hash: string;
  idempotencyKey?: string;
}

export interface UploadedDocumentResult {
  fileId: string;
  fileVersionId: string;
  versionNo: number;
}

export abstract class DocumentRepository {
  abstract createUploadedDocument(input: CreateUploadedDocumentInput): Promise<UploadedDocumentResult>;
  abstract getFileVersionContent(tenantId: string, fileVersionId: string): Promise<FileVersionContent | null>;
}
