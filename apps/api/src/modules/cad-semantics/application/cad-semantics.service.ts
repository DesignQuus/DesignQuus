import { Injectable } from '@nestjs/common';

@Injectable()
export class CadSemanticsService {
  queue(jobType: string, input: unknown) {
    return { accepted: true, status: 'QUEUED', jobType, input };
  }
}
