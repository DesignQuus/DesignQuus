import { Module } from '@nestjs/common';
import { DeadLetterRepository } from './dead-letter.repository';
import { DeadLetterService } from './dead-letter.service';
import { IdempotencyRepository } from './idempotency.repository';
import { IdempotencyService } from './idempotency.service';
import { OutboxRepository } from './outbox.repository';
import { OutboxService } from './outbox.service';
import { PostgresDeadLetterRepository } from './postgres-dead-letter.repository';
import { PostgresIdempotencyRepository } from './postgres-idempotency.repository';
import { PostgresOutboxRepository } from './postgres-outbox.repository';
import { ReliabilityController } from './reliability.controller';

@Module({
  controllers: [ReliabilityController],
  providers: [
    IdempotencyService,
    OutboxService,
    DeadLetterService,
    {
      provide: IdempotencyRepository,
      useClass: PostgresIdempotencyRepository,
    },
    {
      provide: OutboxRepository,
      useClass: PostgresOutboxRepository,
    },
    {
      provide: DeadLetterRepository,
      useClass: PostgresDeadLetterRepository,
    },
  ],
  exports: [IdempotencyService, OutboxService, DeadLetterService],
})
export class ReliabilityModule {}
