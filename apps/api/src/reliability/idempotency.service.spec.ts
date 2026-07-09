import { ConflictException } from '@nestjs/common';
import {
  IdempotencyRepository,
  type IdempotencyRecord,
} from './idempotency.repository';
import {
  createRequestFingerprint,
  IdempotencyService,
} from './idempotency.service';

const record: IdempotencyRecord = {
  id: '10000000-0000-7000-8000-000000000001',
  scope: 'DOCUMENT_UPLOAD',
  idempotencyKey: 'idem-001',
  requestFingerprint: 'sha256:test',
  state: 'IN_PROGRESS',
  responseStatus: null,
  responseBody: null,
  failureCode: null,
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  completedAt: null,
};

function repositoryMock(): jest.Mocked<IdempotencyRepository> {
  return {
    reserve: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
    findByKey: jest.fn(),
  } as jest.Mocked<IdempotencyRepository>;
}

describe('IdempotencyService', () => {
  it('creates the same fingerprint for equivalent object key order', () => {
    const first = createRequestFingerprint({
      b: 2,
      a: { y: 2, x: 1 },
    });
    const second = createRequestFingerprint({
      a: { x: 1, y: 2 },
      b: 2,
    });
    expect(first).toBe(second);
    expect(first).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('reserves a canonical request fingerprint', async () => {
    const repository = repositoryMock();
    repository.reserve.mockResolvedValue({
      recordId: record.id,
      state: 'IN_PROGRESS',
      isNew: true,
    });
    const service = new IdempotencyService(repository);

    const result = await service.reserve({
      tenantId: '10000000-0000-7000-8000-000000000000',
      scope: 'DOCUMENT_UPLOAD',
      idempotencyKey: 'idem-001',
      requestPayload: { z: 2, a: 1 },
      ttlSeconds: 60,
    });

    expect(result.isNew).toBe(true);
    expect(result.requestFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(repository.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'DOCUMENT_UPLOAD',
        idempotencyKey: 'idem-001',
        requestFingerprint: result.requestFingerprint,
      }),
    );
  });

  it('maps fingerprint conflicts to HTTP 409', async () => {
    const repository = repositoryMock();
    repository.reserve.mockRejectedValue(
      Object.assign(new Error('IDEMPOTENCY_FINGERPRINT_CONFLICT'), {
        code: '22023',
      }),
    );
    const service = new IdempotencyService(repository);

    await expect(
      service.reserve({
        tenantId: '10000000-0000-7000-8000-000000000000',
        scope: 'DOCUMENT_UPLOAD',
        idempotencyKey: 'idem-001',
        requestPayload: { changed: true },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('stores completion and failure states through the repository', async () => {
    const repository = repositoryMock();
    repository.complete.mockResolvedValue({
      ...record,
      state: 'COMPLETED',
      responseStatus: 201,
      responseBody: { ok: true },
      completedAt: new Date().toISOString(),
    });
    repository.fail.mockResolvedValue({
      ...record,
      state: 'FAILED',
      failureCode: 'UPLOAD_FAILED',
    });
    const service = new IdempotencyService(repository);

    const completed = await service.complete({
      tenantId: '10000000-0000-7000-8000-000000000000',
      recordId: record.id,
      responseStatus: 201,
      responseBody: { ok: true },
    });
    const failed = await service.fail({
      tenantId: '10000000-0000-7000-8000-000000000000',
      recordId: record.id,
      failureCode: 'UPLOAD_FAILED',
    });

    expect(completed.state).toBe('COMPLETED');
    expect(failed.state).toBe('FAILED');
  });
});
