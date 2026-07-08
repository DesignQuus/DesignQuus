export interface PromoteSpacesResult {
  promotionRunId: string;
  promotedCount: number;
  spaceIds: string[];
}

export abstract class SpacePromotionRepository {
  abstract promoteReviewedRooms(input: {
    tenantId: string;
    importJobId: string;
    floorId: string;
    createdBy?: string;
  }): Promise<PromoteSpacesResult>;
}
