import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { RequestWithId } from '../common/request-id.middleware';

const SERVICE_NAME = 'ai-hvac-engineering-os-api';
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 120;

type RateBucket = {
  windowStartedAt: number;
  count: number;
};

@Injectable()
export class RequestPolicyMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, RateBucket>();

  use(request: Request, response: Response, next: NextFunction): void {
    if (this.isProbePath(request.path)) {
      next();
      return;
    }

    const now = Date.now();
    const windowMs = this.positiveInteger(
      process.env.RATE_LIMIT_WINDOW_MS,
      DEFAULT_WINDOW_MS,
    );
    const maxRequests = this.positiveInteger(
      process.env.RATE_LIMIT_MAX_REQUESTS,
      DEFAULT_MAX_REQUESTS,
    );
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const current = this.buckets.get(key);
    const bucket =
      !current || now - current.windowStartedAt >= windowMs
        ? { windowStartedAt: now, count: 0 }
        : current;

    bucket.count += 1;
    this.buckets.set(key, bucket);
    this.cleanup(now, windowMs);

    const resetAt = bucket.windowStartedAt + windowMs;
    const remaining = Math.max(0, maxRequests - bucket.count);
    response.setHeader('x-ratelimit-limit', String(maxRequests));
    response.setHeader('x-ratelimit-remaining', String(remaining));
    response.setHeader('x-ratelimit-reset', String(Math.ceil(resetAt / 1000)));

    if (bucket.count <= maxRequests) {
      next();
      return;
    }

    const requestId = (request as RequestWithId).requestId ?? 'unknown';
    const timestamp = new Date().toISOString();

    console.warn(
      JSON.stringify({
        timestamp,
        event: 'security.rate_limit_exceeded',
        service: SERVICE_NAME,
        requestId,
        key,
        windowMs,
        maxRequests,
      }),
    );

    response.status(429).json({
      statusCode: 429,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      requestId,
      path: request.path,
      timestamp,
    });
  }

  private isProbePath(path: string): boolean {
    return path.startsWith('/v1/health') || path === '/v1/metrics';
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private cleanup(now: number, windowMs: number): void {
    if (this.buckets.size < 10_000) return;
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.windowStartedAt >= windowMs * 2) {
        this.buckets.delete(key);
      }
    }
  }
}
