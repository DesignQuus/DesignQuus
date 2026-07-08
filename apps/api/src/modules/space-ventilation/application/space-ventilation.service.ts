import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class SpaceVentilationService {
  resolveProfile(input: unknown) {
    return {
      status: 'QUEUED',
      accepted: true,
      input,
    };
  }

  createRun(input: unknown) {
    return {
      status: 'QUEUED',
      accepted: true,
      input,
    };
  }

  approveRuleParameter(input: { verificationStatus?: string }) {
    if (input.verificationStatus !== 'VERIFIED') {
      throw new BadRequestException(
        'verificationStatus must be VERIFIED',
      );
    }
    return {
      status: 'VERIFIED',
    };
  }
}
