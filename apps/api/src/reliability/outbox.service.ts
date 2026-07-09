import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  OutboxRepository,
  type OutboxEvent,
  type OutboxFailureTransition,
} from './outbox.repository';
import { calculateRetryDelayMs } from './retry-policy';

const DEFAULT_RETRY_POLICY_KEY = 'OUTBOX_DEFAULT';

function deterministicJitterUnit(eventId: string, attemptNumber: number): number {
  const digest = createHash('sha256')
    .update(`${eventId}:${attemptNumber}`)
    .digest('hex')
    .slice(0, 8);
  return Number.parseInt(digest, 16) / 0xffffffff;
}

@Injectable()
export class OutboxService {
  constructor(private readonly repository: OutboxRepository) {}

  enqueue(input: {
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    eventVersion?: number;
    payload: unknown;
    retryPolicyKey?: string;
  }): Promise<OutboxEvent> {
    const aggregateType = input.aggregateType.trim();
    const eventType = input.eventType.trim();
    const retryPolicyKey = input.retryPolicyKey?.trim();
    const eventVersion = input.eventVersion ?? 1;

    if (!aggregateType || !input.aggregateId.trim() || !eventType) {
      throw new BadRequestException({
        errorCode: 'OUTBOX_INPUT_REQUIRED',
        message: 'aggregateType, aggregateId, and eventType are required',
      });
    }
    if (!Number.isInteger(eventVersion) || eventVersion < 1) {
      throw new BadRequestException({
        errorCode: 'OUTBOX_EVENT_VERSION_INVALID',
        message: 'eventVersion must be a positive integer',
      });
    }

    return this.repository.enqueue({
      tenantId: input.tenantId,
      aggregateType,
      aggregateId: input.aggregateId.trim(),
      eventType,
      eventVersion,
      payload: input.payload,
      retryPolicyKey: retryPolicyKey || undefined,
    });
  }

  claim(input: {
    tenantId: string;
    workerId: string;
    limit?: number;
    leaseSeconds?: number;
  }): Promise<OutboxEvent[]> {
    const workerId = input.workerId.trim();
    const limit = input.limit ?? 10;
    const leaseSeconds = input.leaseSeconds ?? 60;

    if (!workerId) {
      throw new BadRequestException({
        errorCode: 'OUTBOX_WORKER_ID_REQUIRED',
        message: 'workerId is required',
      });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException({
        errorCode: 'OUTBOX_CLAIM_LIMIT_INVALID',
        message: 'limit must be between 1 and 100',
      });
    }
    if (
      !Number.isInteger(leaseSeconds) ||
      leaseSeconds < 1 ||
      leaseSeconds > 3600
    ) {
      throw new BadRequestException({
        errorCode: 'OUTBOX_LEASE_INVALID',
        message: 'leaseSeconds must be between 1 and 3600',
      });
    }

    return this.repository.claim({
      tenantId: input.tenantId,
      workerId,
      limit,
      leaseSeconds,
    });
  }

  async get(input: {
    tenantId: string;
    eventId: string;
  }): Promise<OutboxEvent> {
    const event = await this.repository.findById(input);
    if (!event) throw this.notFound();
    return event;
  }

  async markPublished(input: {
    tenantId: string;
    eventId: string;
  }): Promise<OutboxEvent> {
    const event = await this.get(input);
    this.assertPublishing(event);

    try {
      return await this.repository.markPublished(input);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('OUTBOX_EVENT_NOT_FOUND')
      ) {
        throw this.notFound();
      }
      throw error;
    }
  }

  async fail(input: {
    tenantId: string;
    eventId: string;
    failureReason: string;
  }): Promise<{
    eventId: string;
    transition: OutboxFailureTransition;
    retryDelayMs: number;
    attemptCount: number;
    maxAttempts: number;
    policyKey: string;
    policyVersion: number;
  }> {
    const failureReason = input.failureReason.trim();
    if (!failureReason) {
      throw new BadRequestException({
        errorCode: 'OUTBOX_FAILURE_REASON_REQUIRED',
        message: 'failureReason is required',
      });
    }

    const event = await this.get(input);
    this.assertPublishing(event);

    const policyKey = event.retryPolicyKey ?? DEFAULT_RETRY_POLICY_KEY;
    const policy = await this.repository.findRetryPolicy({
      tenantId: input.tenantId,
      policyKey,
    });
    if (!policy) {
      throw new UnprocessableEntityException({
        errorCode: 'RETRY_POLICY_NOT_FOUND',
        message: `No enabled retry policy exists for ${policyKey}`,
      });
    }

    const attemptCount = Math.max(1, event.attemptCount);
    const retryDelayMs = calculateRetryDelayMs(
      attemptCount,
      policy,
      deterministicJitterUnit(event.id, attemptCount),
    );
    const transition = await this.repository.fail({
      tenantId: input.tenantId,
      eventId: input.eventId,
      failureReason,
      retryDelayMs,
      maxAttempts: policy.maxAttempts,
    });

    return {
      eventId: event.id,
      transition,
      retryDelayMs,
      attemptCount,
      maxAttempts: policy.maxAttempts,
      policyKey: policy.policyKey,
      policyVersion: policy.policyVersion,
    };
  }

  private assertPublishing(event: OutboxEvent): void {
    if (event.state !== 'PUBLISHING') {
      throw new ConflictException({
        errorCode: 'OUTBOX_EVENT_STATE_INVALID',
        message: 'Only PUBLISHING outbox events can be completed or failed',
      });
    }
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      errorCode: 'OUTBOX_EVENT_NOT_FOUND',
      message: 'Outbox event not found',
    });
  }
}
