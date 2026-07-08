import { Injectable } from '@nestjs/common';
import { SpacePromotionRepository } from './space-promotion.repository';

@Injectable()
export class SpacePromotionService {
  constructor(private readonly repository: SpacePromotionRepository) {}

  promote(input: { tenantId: string; importJobId: string; floorId: string; createdBy?: string }) {
    return this.repository.promoteReviewedRooms(input);
  }
}
