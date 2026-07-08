import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { RequestWithId } from '../common/request-id.middleware';
import { MetricsService } from './metrics.service';

const SERVICE_NAME = 'ai-hvac-engineering-os-api';

@Injectable()
export class RequestObservabilityMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();

    response.on('finish', () => {
      const elapsedNs = process.hrtime.bigint() - startedAt;
      const durationMs = Number(elapsedNs) / 1_000_000;
      const route = this.resolveRoute(request);
      const requestId = (request as RequestWithId).requestId ?? 'unknown';

      this.metrics.recordHttpRequest(
        request.method,
        route,
        response.statusCode,
        durationMs,
      );

      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'http.request',
          service: SERVICE_NAME,
          version: process.env.APP_VERSION ?? '1.2.0-dev',
          buildSha: process.env.GIT_SHA ?? 'unknown',
          requestId,
          method: request.method,
          route,
          statusCode: response.statusCode,
          durationMs: Number(durationMs.toFixed(3)),
        }),
      );
    });

    next();
  }

  private resolveRoute(request: Request): string {
    const route = (request as Request & { route?: { path?: string } }).route;
    if (route?.path) {
      return `${request.baseUrl ?? ''}${route.path}`;
    }
    return request.path || 'unknown';
  }
}
