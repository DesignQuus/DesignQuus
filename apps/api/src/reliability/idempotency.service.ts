import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IdempotencyRepository,
  type IdempotencyRecord,
  type IdempotencyReservation,
} from './idempotency.repository';

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const MAX_TTL_SECONDS = 7 * 24 * 60 * 60;

type PostgresError = Error & {
  code?: string;
};

function normalizeJson(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Request payload contains a non-finite number');
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item));
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value && typeof value === 'object') {
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const child = (value as Record<string, unknown>)[key];
      if (child !== undefined) {
        normalized[key] = normalizeJson(child);
      }
    }
    return normalized;
  }
  throw new Error(`Unsupported request payload value: ${typeof value}`);
}

export function createRequestFingerprint(payload: unknown): string {
  const canonical = JSON.stringify(normalizeJson(payload));
  const digest = createHash('sha256').update(canonical).digest('hex');
  return `sha256:${digest}`;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly repository: IdempotencyRepository) {}

  async reserve(input: {
    tenantId: string;
    scope: string;
    idempotencyKey: string;
    requestPayload: unknown;
    ttlSeconds?: number;
  }): Promise<IdempotencyReservation & { requestFingerprint: string }> {
    const scope = input.scope.trim();
    const idempotencyKey = input.idempotencyKey.trim();
    if (!scope || !idempotencyKey) {
      throw new BadRequestException({
        errorCode: 'IDEMPOTENCY_INPUT_REQUIRED',
        message: 'scope and idempotencyKey are required',
      });
    }

    const ttlSeconds = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    if (
      !Number.isInteger(ttlSeconds) ||
      ttlSeconds < 1 ||
      ttlSeconds > MAX_TTL_SECONDS
    ) {
      throw new BadRequestException({
        errorCode: 'IDEMPOTENCY_TTL_INVALID',
        message: `ttlSeconds must be between 1 and ${MAX_TTL_SECONDS}`,
      });
    }

    let requestFingerprint: string;
    try {
      requestFingerprint = createRequestFingerprint(input.requestPayload);
    } catch (error) {
      throw new BadRequestException({
        errorCode: 'IDEMPOTENCY_PAYLOAD_INVALID',
        message: error instanceof Error ? error.message : 'Invalid request payload',
      });
    }

    try {
      const reservation = await this.repository.reserve({
        tenantId: input.tenantId,
        scope,
        idempotencyKey,
        requestFingerprint,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      });
      return { ...reservation, requestFingerprint };
    } catch (error) {
      if (
        (error as PostgresError)?.code === '22023' ||
        (error instanceof Error &&
          error.message.includes('IDEMPOTENCY_FINGERPRINT_CONFLICT'))
      ) {
        throw new ConflictException({
          errorCode: 'IDEMPOTENCY_FINGERPRINT_CONFLICT',
          message: 'The idempotency key was already used for a different request',
        });
      }
      throw error;
    }
  }

  async complete(input: {
    tenantId: string;
    recordId: string;
    responseStatus: number;
    responseBody: unknown;
  }): Promise<IdempotencyRecord> {
    if (
      !Number.isInteger(input.responseStatus) ||
      input.responseStatus < 100 ||
      input.responseStatus > 599
    ) {
      throw new BadRequestException({
        errorCode: 'IDEMPOTENCY_RESPONSE_STATUS_INVALID',
        message: 'responseStatus must be an HTTP status code',
      });
    }

    return this.wrapNotFound(() => this.repository.complete(input));
  }

  async fail(input: {
    tenantId: string;
    recordId: string;
    failureCode: string;
  }): Promise<IdempotencyRecord> {
    if (!input.failureCode.trim()) {
      throw new BadRequestException({
        errorCode: 'IDEMPOTENCY_FAILURE_CODE_REQUIRED',
        message: 'failureCode is required',
      });
    }
    return this.wrapNotFound(() =>
      this.repository.fail({ ...input, failureCode: input.failureCode.trim() }),
    );
  }

  async get(input: {
    tenantId: string;
    scope: string;
    idempotencyKey: string;
  }): Promise<IdempotencyRecord> {
    const record = await this.repository.findByKey(input);
    if (!record) {
      throw this.notFound();
    }
    return record;
  }

  private async wrapNotFound<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('IDEMPOTENCY_RECORD_NOT_FOUND')
      ) {
        throw this.notFound();
      }
      throw error;
    }
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      errorCode: 'IDEMPOTENCY_RECORD_NOT_FOUND',
      message: 'Idempotency record not found',
    });
  }
}
