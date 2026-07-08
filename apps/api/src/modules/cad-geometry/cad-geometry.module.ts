import { Module } from '@nestjs/common';
import { CadGeometryController } from './presentation/cad-geometry.controller';
import { CadGeometryService } from './application/cad-geometry.service';

@Module({
  controllers: [CadGeometryController],
  providers: [CadGeometryService],
})
export class CadGeometryModule {}
