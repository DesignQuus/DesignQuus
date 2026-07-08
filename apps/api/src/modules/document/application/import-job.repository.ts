export interface ImportJobCreated {
  importJobId: string;
  jobId: string;
  status: 'QUEUED';
}

export abstract class ImportJobRepository {
  abstract create(input: {
    tenantId: string;
    projectId: string;
    projectRevisionId: string;
    sourceFileVersionId: string;
    importType: 'DRAWING_AI' | 'CAD_OBJECT' | 'IFC' | 'OCR';
    idempotencyKey?: string;
  }): Promise<ImportJobCreated>;
}
