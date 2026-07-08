import { SetMetadata } from '@nestjs/common';
import type { SecurityRole } from './identity';

export const SECURITY_ROLES_KEY = 'security:roles';

export const Roles = (...roles: SecurityRole[]) =>
  SetMetadata(SECURITY_ROLES_KEY, roles);
