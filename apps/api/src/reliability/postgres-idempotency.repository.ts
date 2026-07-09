import { Injectable } from '@nestjs/common';
import { TenantTransaction } from '../database/tenant-transaction';
import {
  IdempotencyRepository,
  type IdempotencyRecord,
  type IdempotencyReservation,
  type IdempotencyState,
} from './idempotency.repository';

interface IdempotencyRow {
  id: string;
  scope: string;
  idempotency_key: string;
  request_fingerprint: string;
  state: IdempotencyState;
  response_status: number | null;
  response_body: unknown;
  failure_code: string | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

interface ReservationRow {
  record_id: string;
  record_state: IdempotencyState;
  is_new: boolean;
}

const mapRow = (row: IdempotencyRow): IdempotencyRecord => ({
  id: row.id,
  scope: row.scope,
  idempotencyKey: row.idempotency_key,
  requestFingerprint: row.request_fingerprint,
  state: row.state,
  responseStatus: row.response_status,
  responseBody: row.response_body,
  failureCode: row.failure_code,
  expiresAt: row.expires_at.toISOString(),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  completedAt: row.completed_at?.toISOString() ?? null,
});

@Injectable()
export class PostgresIdempotencyRepository extends IdempotencyRepository {
  constructor(private readonly tx: TenantTransaction) {
    super();
  }

  async reserve(input: {
    tenantId: string;
    scope: string;
    idempotencyKey: string;
    requestFingerprint: string;
    expiresAt: Date;
  }): Promise<IdempotencyReservation> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<ReservationRow>(
        `SELECT record_id, record_state, is_new
           FROM ops.reserve_idempotency($1,$2,$3,$4,$5)`,
        [
          input.tenantId,
          input.scope,
          input.idempotencyKey,
          input.requestFingerprint,
          input.expiresAt,
        ],
      );

      return {
        recordId: result.rows[0].record_id,
        state: result.rows[0].record_state,
        isNew: result.rows[0].is_new,
      };
    });
  }

  async complete(input: {
    tenantId: string;
    recordId: string;
    responseStatus: number;
    responseBody: unknown;
  }): Promise<IdempotencyRecord> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<IdempotencyRow>(
        `UPDATE ops.idempotency_records
            SET state = 'COMPLETED',
                response_status = $2,
                response_body = $3::jsonb,
                failure_code = NULL,
                completed_at = now(),
                updated_at = now()
          WHERE id = $1
          RETURNING id, scope, idempotency_key, request_fingerprint,
                    state, response_status, response_body, failure_code,
                    expires_at, created_at, updated_at, completed_at`,
        [input.recordId, input.responseStatus, JSON.stringify(input.responseBody)],
      );

      if (!result.rowCount) {
        throw new Error('IDEMPOTENCY_RECORD_NOT_FOUND');
      }
      return mapRow(result.rows[0]);
    });
  }

  async fail(input: {
    tenantId: string;
    recordId: string;
    failureCode: string;
  }): Promise<IdempotencyRecord> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<IdempotencyRow>(
        `UPDATE ops.idempotency_records
            SET state = 'FAILED',
                failure_code = $2,
                response_status = NULL,
                response_body = NULL,
                completed_at = NULL,
                updated_at = now()
          WHERE id = $1
          RETURNING id, scope, idempotency_key, request_fingerprint,
                    state, response_status, response_body, failure_code,
                    expires_at, created_at, updated_at, completed_at`,
        [input.recordId, input.failureCode],
      );

      if (!result.rowCount) {
        throw new Error('IDEMPOTENCY_RECORD_NOT_FOUND');
      }
      return mapRow(result.rows[0]);
    });
  }

  async findByKey(input: {
    tenantId: string;
    scope: string;
    idempotencyKey: string;
  }): Promise<IdempotencyRecord | null> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<IdempotencyRow>(
        `SELECT id, scope, idempotency_key, request_fingerprint,
                state, response_status, response_body, failure_code,
                expires_at, created_at, updated_at, completed_at
           FROM ops.idempotency_records
          WHERE scope = $1
            AND idempotency_key = $2`,
        [input.scope, input.idempotencyKey],
      );

      return result.rowCount ? mapRow(result.rows[0]) : null;
    });
  }
}
