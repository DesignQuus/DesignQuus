import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeadLetterRepository,
  type DeadLetterJob,
} from './dead-letter.repository';

@Injectable()
export class DeadLetterService {
  constructor(private readonly repository: DeadLetterRepository) {}

  listPending(input: {
    tenantId: string;
    limit?: number;
  }): Promise<DeadLetterJob[]> {
    const limit = input.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException({
        errorCode: 'DEAD_LETTER_LIMIT_INVALID',
        message: 'limit must be between 1 and 100',
      });
    }
    return this.repository.listPending({ tenantId: input.tenantId, limit });
  }

  async get(input: {
    tenantId: string;
    deadLetterId: string;
  }): Promise<DeadLetterJob> {
    const job = await this.repository.findById(input);
    if (!job) throw this.notFound();
    return job;
  }

  async replay(input: {
    tenantId: string;
    deadLetterId: string;
    replayedBy: string;
  }): Promise<{
    deadLetterId: string;
    newOutboxEventId: string;
    replayedBy: string;
  }> {
    const replayedBy = input.replayedBy.trim();
    if (!replayedBy) {
      throw new BadRequestException({
        errorCode: 'DEAD_LETTER_REPLAY_ACTOR_REQUIRED',
        message: 'replayedBy is required',
      });
    }

    const job = await this.get(input);
    this.assertPending(job);

    try {
      const newOutboxEventId = await this.repository.replay({
        tenantId: input.tenantId,
        deadLetterId: input.deadLetterId,
        replayedBy,
      });
      return {
        deadLetterId: input.deadLetterId,
        newOutboxEventId,
        replayedBy,
      };
    } catch (error) {
      if (
        (error as { code?: string })?.code === '22023' ||
        (error instanceof Error &&
          error.message.includes('DEAD_LETTER_NOT_REPLAYABLE'))
      ) {
        throw this.notPending();
      }
      throw error;
    }
  }

  async abandon(input: {
    tenantId: string;
    deadLetterId: string;
    abandonedBy: string;
  }): Promise<DeadLetterJob> {
    const abandonedBy = input.abandonedBy.trim();
    if (!abandonedBy) {
      throw new BadRequestException({
        errorCode: 'DEAD_LETTER_ABANDON_ACTOR_REQUIRED',
        message: 'abandonedBy is required',
      });
    }

    const job = await this.get(input);
    this.assertPending(job);

    try {
      return await this.repository.abandon({
        tenantId: input.tenantId,
        deadLetterId: input.deadLetterId,
        abandonedBy,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('DEAD_LETTER_NOT_PENDING')
      ) {
        throw this.notPending();
      }
      throw error;
    }
  }

  private assertPending(job: DeadLetterJob): void {
    if (job.replayState !== 'PENDING') {
      throw this.notPending();
    }
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      errorCode: 'DEAD_LETTER_NOT_FOUND',
      message: 'Dead-letter job not found',
    });
  }

  private notPending(): ConflictException {
    return new ConflictException({
      errorCode: 'DEAD_LETTER_NOT_PENDING',
      message: 'Only pending dead-letter jobs can be replayed or abandoned',
    });
  }
}
