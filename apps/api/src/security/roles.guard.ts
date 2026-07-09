import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SecurityRole, RequestWithIdentity } from './identity';
import { SECURITY_ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SecurityRole[]>(
      SECURITY_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<RequestWithIdentity>();
    const role = request.identity?.role;
    if (role && requiredRoles.includes(role)) return true;

    throw new ForbiddenException({
      errorCode: 'AUTH_ROLE_FORBIDDEN',
      message: 'The authenticated role cannot perform this operation',
    });
  }
}
