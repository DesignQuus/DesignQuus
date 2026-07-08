import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TenantId } from '../../../common/tenant';
import { ErvDesignService } from '../application/erv-design.service';
import type { CreateErvDesignRunDto } from './create-erv-design-run.dto';

@Controller('erv-design-runs')
export class ErvDesignController {
  constructor(private readonly service: ErvDesignService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() body: CreateErvDesignRunDto) {
    return this.service.create(tenantId, body);
  }

  @Get(':id')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.get(tenantId, id);
  }
}
