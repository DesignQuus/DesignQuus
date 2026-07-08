import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { RequestWithId } from '../common/request-id.middleware';

const SERVICE_NAME = 'ai-hvac-engineering-os-api';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const requestId = (request as RequestWithId).requestId ?? 'unknown';
    const message = this.resolveMessage(exceptionResponse, statusCode);
    const errorCode = this.resolveErrorCode(exceptionResponse, statusCode);
    const timestamp = new Date().toISOString();

    const logEntry = {
      timestamp,
      event: 'http.error',
      service: SERVICE_NAME,
      version: process.env.APP_VERSION ?? '1.2.0-dev',
      buildSha: process.env.GIT_SHA ?? 'unknown',
      requestId,
      method: request.method,
      path: request.path,
      statusCode,
      errorCode,
      exceptionName:
        exception instanceof Error ? exception.name : 'UnknownException',
      exceptionMessage:
        exception instanceof Error ? exception.message : 'Unknown error',
    };

    if (statusCode >= 500) {
      console.error(JSON.stringify(logEntry));
    } else {
      console.warn(JSON.stringify(logEntry));
    }

    response.status(statusCode).json({
      statusCode,
      errorCode,
      message,
      requestId,
      path: request.path,
      timestamp,
    });
  }

  private resolveMessage(
    exceptionResponse: string | object | undefined,
    statusCode: number,
  ): string {
    if (statusCode >= 500) {
      return 'Internal server error';
    }

    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const value = (exceptionResponse as { message?: unknown }).message;
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.map(String).join('; ');
    }

    return HttpStatus[statusCode] ?? 'Request failed';
  }

  private resolveErrorCode(
    exceptionResponse: string | object | undefined,
    statusCode: number,
  ): string {
    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const value = (exceptionResponse as { errorCode?: unknown }).errorCode;
      if (typeof value === 'string' && value.trim()) return value;
    }

    return `HTTP_${statusCode}`;
  }
}
