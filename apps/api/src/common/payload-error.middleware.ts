import type { ErrorRequestHandler } from 'express';
import type { RequestWithId } from './request-id.middleware';

type BodyParserError = Error & {
  status?: number;
  statusCode?: number;
  type?: string;
};

export const payloadErrorMiddleware: ErrorRequestHandler = (
  error: BodyParserError,
  request,
  response,
  next,
): void => {
  const isPayloadTooLarge =
    error?.status === 413 ||
    error?.statusCode === 413 ||
    error?.type === 'entity.too.large';

  if (!isPayloadTooLarge) {
    next(error);
    return;
  }

  const requestId = (request as RequestWithId).requestId ?? 'unknown';
  const timestamp = new Date().toISOString();

  console.warn(
    JSON.stringify({
      timestamp,
      event: 'security.payload_too_large',
      service: 'ai-hvac-engineering-os-api',
      requestId,
      path: request.path,
      errorCode: 'PAYLOAD_TOO_LARGE',
    }),
  );

  response.status(413).json({
    statusCode: 413,
    errorCode: 'PAYLOAD_TOO_LARGE',
    message: 'Request payload exceeds the configured limit',
    requestId,
    path: request.path,
    timestamp,
  });
};
