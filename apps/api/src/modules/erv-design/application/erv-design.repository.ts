import type { ErvDesignRun } from '../domain/erv-design-run';

export abstract class ErvDesignRepository {
  abstract create(input: {
    tenantId: string;
    projectId: string;
    projectRevisionId: string;
    sourceFileVersionId: string;
  }): Promise<ErvDesignRun>;

  abstract findById(tenantId: string, id: string): Promise<ErvDesignRun | null>;
}
