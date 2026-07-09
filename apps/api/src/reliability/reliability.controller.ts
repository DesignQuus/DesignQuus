import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { TenantId } from '../common/tenant';
import type { RequestWithIdentity } from '../security/identity';
import { Roles } from '../security/roles.decorator';
import { DeadLetterService } from './dead-letter.service';
import { IdempotencyService } from './idempotency.service';
import { OutboxService } from './outbox.service';

@Controller('reliability')
export class ReliabilityController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly outbox: OutboxService,
    private readonly deadLetters: DeadLetterService,
  ) {}

  @Post('idempotency/reservations')
  @Roles('ENGINEER', 'ADMINISTRATOR')
  reserveIdempotency(
    @TenantId() tenantId: string,
    @Body()
    body: {
      scope: string;
      idempotencyKey: string;
      requestPayload: unknown;
      ttlSeconds?: number;
    },
  ) {
    return this.idempotency.reserve({ tenantId, ...body });
  }

  @Get('idempotency/:scope/:idempotencyKey')
  @Roles('ENGINEER', 'APPROVER', 'ADMINISTRATOR')
  getIdempotency(
    @TenantId() tenantId: string,
    @Param('scope') scope: string,
    @Param('idempotencyKey') idempotencyKey: string,
  ) {
    return this.idempotency.get({ tenantId, scope, idempotencyKey });
  }

  @Post('idempotency/:recordId/complete')
  @Roles('ENGINEER', 'ADMINISTRATOR')
  completeIdempotency(
    @TenantId() tenantId: string,
    @Param('recordId') recordId: string,
    @Body() body: { responseStatus: number; responseBody: unknown },
  ) {
    return this.idempotency.complete({ tenantId, recordId, ...body });
  }

  @Post('idempotency/:recordId/fail')
  @Roles('ENGINEER', 'ADMINISTRATOR')
  failIdempotency(
    @TenantId() tenantId: string,
    @Param('recordId') recordId: string,
    @Body() body: { failureCode: string },
  ) {
    return this.idempotency.fail({ tenantId, recordId, ...body });
  }

  @Post('outbox/events')
  @Roles('ENGINEER', 'ADMINISTRATOR')
  enqueueOutboxEvent(
    @TenantId() tenantId: string,
    @Body()
    body: {
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      eventVersion?: number;
      payload: unknown;
      retryPolicyKey?: string;
    },
  ) {
    return this.outbox.enqueue({ tenantId, ...body });
  }

  @Post('outbox/claim')
  @Roles('ADMINISTRATOR')
  claimOutboxEvents(
    @TenantId() tenantId: string,
    @Body() body: { workerId: string; limit?: number; leaseSeconds?: number },
  ) {
    return this.outbox.claim({ tenantId, ...body });
  }

  @Get('outbox/:eventId')
  @Roles('ENGINEER', 'APPROVER', 'ADMINISTRATOR')
  getOutboxEvent(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.outbox.get({ tenantId, eventId });
  }

  @Post('outbox/:eventId/published')
  @Roles('ADMINISTRATOR')
  markOutboxPublished(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.outbox.markPublished({ tenantId, eventId });
  }

  @Post('outbox/:eventId/fail')
  @Roles('ADMINISTRATOR')
  failOutboxEvent(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
    @Body() body: { failureReason: string },
  ) {
    return this.outbox.fail({ tenantId, eventId, ...body });
  }

  @Get('dead-letters')
  @Roles('APPROVER', 'ADMINISTRATOR')
  listDeadLetters(
    @TenantId() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.deadLetters.listPending({
      tenantId,
      limit: limit === undefined ? undefined : Number(limit),
    });
  }

  @Get('dead-letters/:deadLetterId')
  @Roles('APPROVER', 'ADMINISTRATOR')
  getDeadLetter(
    @TenantId() tenantId: string,
    @Param('deadLetterId') deadLetterId: string,
  ) {
    return this.deadLetters.get({ tenantId, deadLetterId });
  }

  @Post('dead-letters/:deadLetterId/replay')
  @Roles('ADMINISTRATOR')
  replayDeadLetter(
    @TenantId() tenantId: string,
    @Param('deadLetterId') deadLetterId: string,
    @Req() request: RequestWithIdentity,
  ) {
    return this.deadLetters.replay({
      tenantId,
      deadLetterId,
      replayedBy: request.identity.userId,
    });
  }

  @Post('dead-letters/:deadLetterId/abandon')
  @Roles('ADMINISTRATOR')
  abandonDeadLetter(
    @TenantId() tenantId: string,
    @Param('deadLetterId') deadLetterId: string,
    @Req() request: RequestWithIdentity,
  ) {
    return this.deadLetters.abandon({
      tenantId,
      deadLetterId,
      abandonedBy: request.identity.userId,
    });
  }
}
