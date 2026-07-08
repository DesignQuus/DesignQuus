import { Injectable } from '@nestjs/common';

@Injectable()
export class CatalogImportService {
  createRun(input: unknown) {
    return { status: 'UPLOADED', input };
  }

  validateRun(id: string) {
    return { id, status: 'VALIDATING' };
  }

  publishRun(id: string) {
    return { id, status: 'PUBLISHED' };
  }
}
