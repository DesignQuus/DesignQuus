import { Injectable } from '@nestjs/common';
import { TenantTransaction } from '../database/tenant-transaction';
import {
  OutboxRepository,
  type OutboxEvent,
  type OutboxFailureTransition,
  type OutboxState,
  type RetryPolicyRecord,
} from './outbox.repository';

interface OutboxRow {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  event_version: number;
  payload: unknown;
  state: OutboxState;
  retry_policy_key: string | null;
  attempt_count: number;
  next_attempt_at: Date;
  locked_at: Date | null;
  locked_by: string | null;
  lease_expires_at: Date | null;
  published_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

interface RetryPolicyRow {
  policy_key: string;
  policy_version: number;
  max_attempts: number;
  base_delay_ms: number;
  max_delay_ms: number;
  backoff_multiplier: string | number;
  jitter_ratio: string | number;
}

interface FailureTransitionRow {
  transition: OutboxFailureTransition;
}

const mapEvent = (row: OutboxRow): OutboxEvent => ({
  id: row.id,
  aggregateType: row.aggregate_type,
  aggregateId: row.aggregate_id,
  eventType: row.event_type,
  eventVersion: row.event_version,
  payload: row.payload,
  state: row.state,
  retryPolicyKey: row.retry_policy_key,
  attemptCount: row.attempt_count,
  nextAttemptAt: row.next_attempt_at.toISOString(),
  lockedAt: row.locked_at?.toISOString() ?? null,
  lockedBy: row.locked_by,
  leaseExpiresAt: row.lease_expires_at?.toISOString() ?? null,
  publishedAt: row.published_at?.toISOString() ?? null,
  lastError: row.last_error,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const eventColumns = `
  id, aggregate_type, aggregate_id, event_type, event_version,
  payload, state, retry_policy_key, attempt_count, next_attempt_at,
  locked_at, locked_by, lease_expires_at, published_at, last_error,
  created_at, updated_at
`;

@Injectable()
export class PostgresOutboxRepository extends OutboxRepository {
  constructor(private readonly tx: TenantTransaction) {
    super();
  }

  async enqueue(input: {
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    eventVersion: number;
    payload: unknown;
    retryPolicyKey?: string;
  }): Promise<OutboxEvent> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<OutboxRow>(
        `INSERT INTO ops.outbox_events (
           tenant_id, aggregate_type, aggregate_id, event_type,
           event_version, payload, retry_policy_key
         ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
         RETURNING ${eventColumns}`,
        [
          input.tenantId,
          input.aggregateType,
          input.aggregateId,
          input.eventType,
          input.eventVersion,
          JSON.stringify(input.payload),
          input.retryPolicyKey ?? null,
        ],
      );
      return mapEvent(result.rows[0]);
    });
  }

  async claim(input: {
    tenantId: string;
    workerId: string;
    limit: number;
    leaseSeconds: number;
  }): Promise<OutboxEvent[]> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<OutboxRow>(
        `SELECT ${eventColumns}
           FROM ops.claim_outbox_events($1,$2,$3)`,
        [input.workerId, input.limit, input.leaseSeconds],
      );
      return result.rows.map(mapEvent);
    });
  }

  async findById(input: {
    tenantId: string;
    eventId: string;
  }): Promise<OutboxEvent | null> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<OutboxRow>(
        `SELECT ${eventColumns}
           FROM ops.outbox_events
          WHERE id = $1`,
        [input.eventId],
      );
      return result.rowCount ? mapEvent(result.rows[0]) : null;
    });
  }

  async findRetryPolicy(input: {
    tenantId: string;
    policyKey: string;
  }): Promise<RetryPolicyRecord | null> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<RetryPolicyRow>(
        `SELECT policy_key, policy_version, max_attempts,
                base_delay_ms, max_delay_ms,
                backoff_multiplier, jitter_ratio
           FROM ops.retry_policies
          WHERE policy_key = $1
            AND enabled = true
          ORDER BY policy_version DESC
          LIMIT 1`,
        [input.policyKey],
      );

      if (!result.rowCount) return null;
      const row = result.rows[0];
      return {
        policyKey: row.policy_key,
        policyVersion: row.policy_version,
        maxAttempts: row.max_attempts,
        baseDelayMs: row.base_delay_ms,
        maxDelayMs: row.max_delay_ms,
        backoffMultiplier: Number(row.backoff_multiplier),
        jitterRatio: Number(row.jitter_ratio),
      };
    });
  }

  async markPublished(input: {
    tenantId: string;
    eventId: string;
  }): Promise<OutboxEvent> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<OutboxRow>(
        `UPDATE ops.outbox_events
            SET state = 'PUBLISHED',
                published_at = now(),
                locked_at = NULL,
                locked_by = NULL,
                lease_expires_at = NULL,
                last_error = NULL,
                updated_at = now()
          WHERE id = $1
          RETURNING ${eventColumns}`,
        [input.eventId],
      );
      if (!result.rowCount) {
        throw new Error('OUTBOX_EVENT_NOT_FOUND');
      }
      return mapEvent(result.rows[0]);
    });
  }

  async fail(input: {
    tenantId: string;
    eventId: string;
    failureReason: string;
    retryDelayMs: number;
    maxAttempts: number;
  }): Promise<OutboxFailureTransition> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<FailureTransitionRow>(
        `SELECT ops.fail_outbox_event($1,$2,$3,$4) AS transition`,
        [
          input.eventId,
          input.failureReason,
          input.retryDelayMs,
          input.maxAttempts,
        ],
      );
      return result.rows[0].transition;
    });
  }
}
