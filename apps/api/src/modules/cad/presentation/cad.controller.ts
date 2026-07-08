import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CadService } from '../application/cad.service';

@Controller('cad')
export class CadController {
  constructor(private readonly service: CadService) {}

  @Post('import-jobs')
  createImportJob(@Body() body: unknown) {
    return this.service.createImportJob(body);
  }

  @Get('import-jobs/:id/objects')
  getObjects(@Param('id') id: string) {
    return { importRunId: id, objects: [] };
  }

  @Post('transforms/calibrate')
  calibrate(@Body() body: unknown) {
    return this.service.calibrateTransform(body);
  }

  @Get('transforms/:id')
  getTransform(@Param('id') id: string) {
    return { id };
  }
}
