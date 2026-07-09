import { ConflictException } from '@nestjs/common';
import {
  OutboxRepository,
  type OutboxEvent,
  type RetryPolicyRecord,
} from './outbox.repository';
import { OutboxService } from './outbox.service';

const event: OutboxEvent = {
  id: '20000000-0000-7000-8000-000000000001',
  aggregateType: 'PROJECT',
  aggregateId: '20000000-0000-7000-8000-000000000101',
  eventType: 'PROJECT.UPDATED',
  eventVersion: 1,
  payload: { sequence: 1 },
  state: 'PUBLISHING',
  retryPolicyKey: 'OUTBOX_DEFAULT',
  attemptCount: 2,
  nextAttemptAt: new Date().toISOString(),
  lockedAt: new Date().toISOString(),
  lockedBy: 'worker-one',
  leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  publishedAt: null,
  lastError: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const retryPolicy: RetryPolicyRecord = {
  policyKey: 'OUTBOX_DEFAULT',
  policyVersion: 1,
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  jitterRatio: 0.1,
};

function repositoryMock(): jest.Mocked<OutboxRepository> {
  return {
    enqueue: jest.fn(),
    claim: jest.fn(),
    findById: jest.fn(),
    findRetryPolicy: jest.fn(),
    markPublished: jest.fn(),
    fail: jest.fn(),
  } as jest.Mocked<OutboxRepository>;
}

describe('OutboxService', () => {
  it('claims work with bounded worker parameters', async () => {
    const repository = repositoryMock();
    repository.claim.mockResolvedValue([event]);
    const service = new OutboxService(repository);

    const claimed = await service.claim({
      tenantId: '20000000-0000-7000-8000-000000000000',
      workerId: 'worker-one',
      limit: 1,
      leaseSeconds: 30,
    });

    expect(claimed).toHaveLength(1);
    expect(repository.claim).toHaveBeenCalledWith({
      tenantId: '20000000-0000-7000-8000-000000000000',
      workerId: 'worker-one',
      limit: 1,
      leaseSeconds: 30,
    });
  });

  it('uses the configured retry policy for deterministic failure transitions', async () => {
    const repository = repositoryMock();
    repository.findById.mockResolvedValue(event);
    repository.findRetryPolicy.mockResolvedValue(retryPolicy);
    repository.fail.mockResolvedValue('RETRY_SCHEDULED');
    const service = new OutboxService(repository);

    const result = await service.fail({
      tenantId: '20000000-0000-7000-8000-000000000000',
      eventId: event.id,
      failureReason: 'transient publisher failure',
    });

    expect(result.transition).toBe('RETRY_SCHEDULED');
    expect(result.retryDelayMs).toBeGreaterThanOrEqual(0);
    expect(result.policyVersion).toBe(1);
    expect(repository.fail).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: event.id,
        maxAttempts: 3,
        retryDelayMs: result.retryDelayMs,
      }),
    );
  });

  it('rejects publish or fail transitions outside PUBLISHING state', async () => {
    const repository = repositoryMock();
    repository.findById.mockResolvedValue({ ...event, state: 'PENDING' });
    const service = new OutboxService(repository);

    await expect(
      service.markPublished({
        tenantId: '20000000-0000-7000-8000-000000000000',
        eventId: event.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
