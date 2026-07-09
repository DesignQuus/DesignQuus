import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { isSecurityRole, type RequestIdentity, type RequestWithIdentity } from './identity';
import { IS_PUBLIC_KEY } from './public.decorator';
import { readSecurityEnvironment } from './security-environment';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const security = readSecurityEnvironment();

    if (security.authMode === 'trusted_gateway') {
      const providedSecret = this.header(request, 'x-auth-secret');
      if (!this.secretsMatch(providedSecret, security.authSharedSecret)) {
        throw new UnauthorizedException({
          errorCode: 'AUTH_GATEWAY_SECRET_INVALID',
          message: 'Trusted gateway authentication failed',
        });
      }
    }

    const userId = this.header(request, 'x-user-id');
    const tenantId = this.header(request, 'x-tenant-id');
    const roleValue = this.header(request, 'x-user-role').toUpperCase();

    if (!userId) {
      throw new UnauthorizedException({
        errorCode: 'AUTH_USER_ID_REQUIRED',
        message: 'x-user-id header is required',
      });
    }
    if (!UUID_PATTERN.test(tenantId)) {
      throw new UnauthorizedException({
        errorCode: 'AUTH_TENANT_ID_INVALID',
        message: 'x-tenant-id must be a UUID',
      });
    }
    if (!isSecurityRole(roleValue)) {
      throw new UnauthorizedException({
        errorCode: 'AUTH_ROLE_INVALID',
        message: 'x-user-role is invalid',
      });
    }

    const identity: RequestIdentity = {
      userId,
      tenantId,
      role: roleValue,
      authMode:
        security.authMode === 'trusted_gateway'
          ? 'trusted_gateway'
          : 'development',
    };

    (request as RequestWithIdentity).identity = identity;
    return true;
  }

  private header(request: Request, name: string): string {
    const value = request.headers[name];
    const first = Array.isArray(value) ? value[0] : value;
    return first?.trim() ?? '';
  }

  private secretsMatch(provided: string, expected: string): boolean {
    if (!provided || !expected) return false;
    const providedBuffer = Buffer.from(provided, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (providedBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(providedBuffer, expectedBuffer);
  }
}
