import { Injectable } from '@nestjs/common';
import { TenantTransaction } from '../database/tenant-transaction';
import {
  DeadLetterRepository,
  type DeadLetterJob,
  type DeadLetterReplayState,
} from './dead-letter.repository';

interface DeadLetterRow {
  id: string;
  source_queue: string;
  source_job_id: string;
  job_type: string;
  payload: unknown;
  failure_reason: string;
  failure_count: number;
  replay_state: DeadLetterReplayState;
  replayed_at: Date | null;
  replayed_by: string | null;
  created_at: Date;
}

interface ReplayRow {
  new_event_id: string;
}

const deadLetterColumns = `
  id, source_queue, source_job_id, job_type, payload,
  failure_reason, failure_count, replay_state,
  replayed_at, replayed_by, created_at
`;

const mapRow = (row: DeadLetterRow): DeadLetterJob => ({
  id: row.id,
  sourceQueue: row.source_queue,
  sourceJobId: row.source_job_id,
  jobType: row.job_type,
  payload: row.payload,
  failureReason: row.failure_reason,
  failureCount: row.failure_count,
  replayState: row.replay_state,
  replayedAt: row.replayed_at?.toISOString() ?? null,
  replayedBy: row.replayed_by,
  createdAt: row.created_at.toISOString(),
});

@Injectable()
export class PostgresDeadLetterRepository extends DeadLetterRepository {
  constructor(private readonly tx: TenantTransaction) {
    super();
  }

  async findById(input: {
    tenantId: string;
    deadLetterId: string;
  }): Promise<DeadLetterJob | null> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<DeadLetterRow>(
        `SELECT ${deadLetterColumns}
           FROM ops.dead_letter_jobs
          WHERE id = $1`,
        [input.deadLetterId],
      );
      return result.rowCount ? mapRow(result.rows[0]) : null;
    });
  }

  async listPending(input: {
    tenantId: string;
    limit: number;
  }): Promise<DeadLetterJob[]> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<DeadLetterRow>(
        `SELECT ${deadLetterColumns}
           FROM ops.dead_letter_jobs
          WHERE replay_state = 'PENDING'
          ORDER BY created_at, id
          LIMIT $1`,
        [input.limit],
      );
      return result.rows.map(mapRow);
    });
  }

  async replay(input: {
    tenantId: string;
    deadLetterId: string;
    replayedBy: string;
  }): Promise<string> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<ReplayRow>(
        `SELECT ops.replay_dead_letter($1,$2) AS new_event_id`,
        [input.deadLetterId, input.replayedBy],
      );
      return result.rows[0].new_event_id;
    });
  }

  async abandon(input: {
    tenantId: string;
    deadLetterId: string;
    abandonedBy: string;
  }): Promise<DeadLetterJob> {
    return this.tx.run(input.tenantId, async (client) => {
      const result = await client.query<DeadLetterRow>(
        `UPDATE ops.dead_letter_jobs
            SET replay_state = 'ABANDONED',
                replayed_by = $2
          WHERE id = $1
            AND replay_state = 'PENDING'
          RETURNING ${deadLetterColumns}`,
        [input.deadLetterId, input.abandonedBy],
      );
      if (!result.rowCount) {
        throw new Error('DEAD_LETTER_NOT_PENDING');
      }
      return mapRow(result.rows[0]);
    });
  }
}
