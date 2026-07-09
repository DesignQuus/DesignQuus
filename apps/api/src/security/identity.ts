import type { Request } from 'express';

export const SECURITY_ROLES = [
  'OPERATOR',
  'ENGINEER',
  'APPROVER',
  'ADMINISTRATOR',
] as const;

export type SecurityRole = (typeof SECURITY_ROLES)[number];

export type RequestIdentity = {
  userId: string;
  tenantId: string;
  role: SecurityRole;
  authMode: 'trusted_gateway' | 'development';
};

export type RequestWithIdentity = Request & {
  identity: RequestIdentity;
  requestId?: string;
};

export function isSecurityRole(value: string): value is SecurityRole {
  return (SECURITY_ROLES as readonly string[]).includes(value);
}
