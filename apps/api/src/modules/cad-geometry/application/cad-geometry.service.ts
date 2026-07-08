import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class CadGeometryService {
  createUnitResolution(input: unknown) {
    return {
      status: 'QUEUED',
      accepted: true,
      input,
    };
  }

  confirmUnit(input: { unitCode?: number }) {
    if (typeof input.unitCode !== 'number') {
      throw new BadRequestException('unitCode is required');
    }
    return {
      status: 'USER_CONFIRMED',
      unitCode: input.unitCode,
    };
  }

  createSpacePromotion(input: unknown) {
    return {
      status: 'PLANNING',
      accepted: true,
      input,
    };
  }
}
