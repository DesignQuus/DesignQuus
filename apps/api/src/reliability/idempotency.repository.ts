export type IdempotencyState = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type IdempotencyRecord = {
  id: string;
  scope: string;
  idempotencyKey: string;
  requestFingerprint: string;
  state: IdempotencyState;
  responseStatus: number | null;
  responseBody: unknown;
  failureCode: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type IdempotencyReservation = {
  recordId: string;
  state: IdempotencyState;
  isNew: boolean;
};

export abstract class IdempotencyRepository {
  abstract reserve(input: {
    tenantId: string;
    scope: string;
    idempotencyKey: string;
    requestFingerprint: string;
    expiresAt: Date;
  }): Promise<IdempotencyReservation>;

  abstract complete(input: {
    tenantId: string;
    recordId: string;
    responseStatus: number;
    responseBody: unknown;
  }): Promise<IdempotencyRecord>;

  abstract fail(input: {
    tenantId: string;
    recordId: string;
    failureCode: string;
  }): Promise<IdempotencyRecord>;

  abstract findByKey(input: {
    tenantId: string;
    scope: string;
    idempotencyKey: string;
  }): Promise<IdempotencyRecord | null>;
}
