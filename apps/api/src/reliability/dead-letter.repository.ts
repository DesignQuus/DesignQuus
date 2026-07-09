export type DeadLetterReplayState = 'PENDING' | 'REPLAYED' | 'ABANDONED';

export type DeadLetterJob = {
  id: string;
  sourceQueue: string;
  sourceJobId: string;
  jobType: string;
  payload: unknown;
  failureReason: string;
  failureCount: number;
  replayState: DeadLetterReplayState;
  replayedAt: string | null;
  replayedBy: string | null;
  createdAt: string;
};

export abstract class DeadLetterRepository {
  abstract findById(input: {
    tenantId: string;
    deadLetterId: string;
  }): Promise<DeadLetterJob | null>;

  abstract listPending(input: {
    tenantId: string;
    limit: number;
  }): Promise<DeadLetterJob[]>;

  abstract replay(input: {
    tenantId: string;
    deadLetterId: string;
    replayedBy: string;
  }): Promise<string>;

  abstract abandon(input: {
    tenantId: string;
    deadLetterId: string;
    abandonedBy: string;
  }): Promise<DeadLetterJob>;
}
