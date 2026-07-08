import { Injectable } from '@nestjs/common';

@Injectable()
export class CadService {
  createImportJob(input: unknown) {
    return {
      status: 'QUEUED',
      accepted: true,
      input,
    };
  }

  calibrateTransform(input: unknown) {
    return {
      status: 'QUEUED',
      accepted: true,
      input,
    };
  }
}
