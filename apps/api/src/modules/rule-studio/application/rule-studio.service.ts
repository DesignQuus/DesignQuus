import { Injectable } from '@nestjs/common';

@Injectable()
export class RuleStudioService {
  createDraft(input: unknown) {
    return { status: 'DRAFT', input };
  }

  compileDraft(id: string) {
    return { id, status: 'COMPILED' };
  }

  runTests(id: string) {
    return { id, status: 'RUNNING' };
  }

  analyzeApplicability(input: unknown) {
    return { status: 'RUNNING', input };
  }
}
