import { ConflictException } from '@nestjs/common';
import {
  DeadLetterRepository,
  type DeadLetterJob,
} from './dead-letter.repository';
import { DeadLetterService } from './dead-letter.service';

const job: DeadLetterJob = {
  id: '30000000-0000-7000-8000-000000000001',
  sourceQueue: 'OUTBOX',
  sourceJobId: '30000000-0000-7000-8000-000000000101',
  jobType: 'PROJECT.UPDATED',
  payload: { sequence: 1 },
  failureReason: 'terminal failure',
  failureCount: 3,
  replayState: 'PENDING',
  replayedAt: null,
  replayedBy: null,
  createdAt: new Date().toISOString(),
};

function repositoryMock(): jest.Mocked<DeadLetterRepository> {
  return {
    findById: jest.fn(),
    listPending: jest.fn(),
    replay: jest.fn(),
    abandon: jest.fn(),
  } as jest.Mocked<DeadLetterRepository>;
}

describe('DeadLetterService', () => {
  it('replays a pending dead-letter job and returns the new outbox event', async () => {
    const repository = repositoryMock();
    repository.findById.mockResolvedValue(job);
    repository.replay.mockResolvedValue(
      '30000000-0000-7000-8000-000000000201',
    );
    const service = new DeadLetterService(repository);

    const result = await service.replay({
      tenantId: '30000000-0000-7000-8000-000000000000',
      deadLetterId: job.id,
      replayedBy: 'admin-user',
    });

    expect(result).toEqual({
      deadLetterId: job.id,
      newOutboxEventId: '30000000-0000-7000-8000-000000000201',
      replayedBy: 'admin-user',
    });
  });

  it('rejects replay when the dead-letter job is no longer pending', async () => {
    const repository = repositoryMock();
    repository.findById.mockResolvedValue({ ...job, replayState: 'REPLAYED' });
    const service = new DeadLetterService(repository);

    await expect(
      service.replay({
        tenantId: '30000000-0000-7000-8000-000000000000',
        deadLetterId: job.id,
        replayedBy: 'admin-user',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('abandons a pending job through the repository', async () => {
    const repository = repositoryMock();
    repository.findById.mockResolvedValue(job);
    repository.abandon.mockResolvedValue({
      ...job,
      replayState: 'ABANDONED',
      replayedBy: 'admin-user',
    });
    const service = new DeadLetterService(repository);

    const result = await service.abandon({
      tenantId: '30000000-0000-7000-8000-000000000000',
      deadLetterId: job.id,
      abandonedBy: 'admin-user',
    });

    expect(result.replayState).toBe('ABANDONED');
  });
});
