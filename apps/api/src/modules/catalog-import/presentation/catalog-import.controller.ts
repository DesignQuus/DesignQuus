import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CatalogImportService } from '../application/catalog-import.service';

@Controller('catalog-import')
export class CatalogImportController {
  constructor(private readonly service: CatalogImportService) {}

  @Post('runs')
  createRun(@Body() body: unknown) {
    return this.service.createRun(body);
  }

  @Post('runs/:id/validate')
  validateRun(@Param('id') id: string) {
    return this.service.validateRun(id);
  }

  @Get('runs/:id/rows')
  getRows(@Param('id') id: string) {
    return { id, rows: [] };
  }

  @Post('runs/:id/publish')
  publishRun(@Param('id') id: string) {
    return this.service.publishRun(id);
  }
}
