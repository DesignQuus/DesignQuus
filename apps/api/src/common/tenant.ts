import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
  const value = request.headers['x-tenant-id'];
  const tenantId = Array.isArray(value) ? value[0] : value;
  if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
  return tenantId;
});
