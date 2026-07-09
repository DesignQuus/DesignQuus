import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.constants';
import { Public } from '../../security/public.decorator';

const SERVICE_NAME = 'ai-hvac-engineering-os-api';
const READINESS_TIMEOUT_MS = 3_000;

@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      version: process.env.APP_VERSION ?? '1.2.0-dev',
      buildSha: process.env.GIT_SHA ?? 'unknown',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      endpoints: {
        liveness: '/v1/health/live',
        readiness: '/v1/health/ready',
      },
    };
  }

  @Get('live')
  getLiveness() {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReadiness() {
    const startedAt = Date.now();

    try {
      await Promise.race([
        this.pool.query('SELECT 1'),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('database readiness timeout')),
            READINESS_TIMEOUT_MS,
          );
        }),
      ]);

      return {
        status: 'ready',
        service: SERVICE_NAME,
        version: process.env.APP_VERSION ?? '1.2.0-dev',
        checks: {
          database: {
            status: 'up',
            latencyMs: Date.now() - startedAt,
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: SERVICE_NAME,
        checks: {
          database: {
            status: 'down',
          },
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
