import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

export type RequestWithId = Request & {
  requestId: string;
};

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incoming = request.header(REQUEST_ID_HEADER)?.trim();
  const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();

  (request as RequestWithId).requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
