import type { RetryPolicy } from './retry-policy';

export type OutboxState =
  | 'PENDING'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'DEAD_LETTER';

export type OutboxEvent = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  payload: unknown;
  state: OutboxState;
  retryPolicyKey: string | null;
  attemptCount: number;
  nextAttemptAt: string;
  lockedAt: string | null;
  lockedBy: string | null;
  leaseExpiresAt: string | null;
  publishedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RetryPolicyRecord = RetryPolicy & {
  policyKey: string;
  policyVersion: number;
};

export type OutboxFailureTransition = 'RETRY_SCHEDULED' | 'DEAD_LETTER';

export abstract class OutboxRepository {
  abstract enqueue(input: {
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    eventVersion: number;
    payload: unknown;
    retryPolicyKey?: string;
  }): Promise<OutboxEvent>;

  abstract claim(input: {
    tenantId: string;
    workerId: string;
    limit: number;
    leaseSeconds: number;
  }): Promise<OutboxEvent[]>;

  abstract findById(input: {
    tenantId: string;
    eventId: string;
  }): Promise<OutboxEvent | null>;

  abstract findRetryPolicy(input: {
    tenantId: string;
    policyKey: string;
  }): Promise<RetryPolicyRecord | null>;

  abstract markPublished(input: {
    tenantId: string;
    eventId: string;
  }): Promise<OutboxEvent>;

  abstract fail(input: {
    tenantId: string;
    eventId: string;
    failureReason: string;
    retryDelayMs: number;
    maxAttempts: number;
  }): Promise<OutboxFailureTransition>;
}
