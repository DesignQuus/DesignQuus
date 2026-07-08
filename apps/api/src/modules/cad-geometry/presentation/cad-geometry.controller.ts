import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CadGeometryService } from '../application/cad-geometry.service';

@Controller('cad-geometry')
export class CadGeometryController {
  constructor(private readonly service: CadGeometryService) {}

  @Post('unit-resolutions')
  createUnitResolution(@Body() body: unknown) {
    return this.service.createUnitResolution(body);
  }

  @Post('unit-resolutions/:id/confirm')
  confirmUnit(
    @Param('id') id: string,
    @Body() body: { unitCode?: number },
  ) {
    return {
      id,
      ...this.service.confirmUnit(body),
    };
  }

  @Get('unit-resolutions/:id')
  getUnitResolution(@Param('id') id: string) {
    return { id };
  }

  @Post('space-promotion-runs')
  createSpacePromotion(@Body() body: unknown) {
    return this.service.createSpacePromotion(body);
  }

  @Get('space-promotion-runs/:id')
  getSpacePromotion(@Param('id') id: string) {
    return { id };
  }

  @Post('space-promotion-runs/:id/execute')
  executeSpacePromotion(@Param('id') id: string) {
    return {
      id,
      status: 'RUNNING',
    };
  }
}
