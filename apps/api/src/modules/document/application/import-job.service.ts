import { Injectable } from '@nestjs/common';
import { ImportJobRepository } from './import-job.repository';

@Injectable()
export class ImportJobService {
  constructor(private readonly repository: ImportJobRepository) {}

  create(input: {
    tenantId: string;
    projectId: string;
    projectRevisionId: string;
    sourceFileVersionId: string;
    importType: 'DRAWING_AI' | 'CAD_OBJECT' | 'IFC' | 'OCR';
    idempotencyKey?: string;
  }) {
    return this.repository.create(input);
  }
}
