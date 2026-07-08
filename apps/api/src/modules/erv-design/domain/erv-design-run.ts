import type { ErvDesignStatus } from './erv-design-status';
export interface ErvDesignRun {
  id: string;
  projectId: string;
  projectRevisionId: string;
  sourceFileVersionId: string;
  status: ErvDesignStatus;
  currentStep: string;
  createdAt: string;
}
