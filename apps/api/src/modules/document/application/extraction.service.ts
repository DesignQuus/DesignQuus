import { Injectable } from '@nestjs/common';
import { ExtractionRepository, ReviewDecision } from './extraction.repository';

@Injectable()
export class ExtractionService {
  constructor(private readonly repository: ExtractionRepository) {}

  list(tenantId: string, importJobId: string) {
    return this.repository.listByImportJob(tenantId, importJobId);
  }

  review(input: {
    tenantId: string;
    extractionId: string;
    decision: ReviewDecision;
    correctedValue?: string;
    reviewedBy?: string;
  }) {
    return this.repository.review(input);
  }
}
