import {
  UnauthorizedException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { RequestWithIdentity } from '../security/identity';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithIdentity>();
    const tenantId = request.identity?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedException({
        errorCode: 'AUTH_IDENTITY_REQUIRED',
        message: 'Verified request identity is required',
      });
    }

    return tenantId;
  },
);
