import { Module } from '@nestjs/common';
import { SpaceVentilationController } from './presentation/space-ventilation.controller';
import { SpaceVentilationService } from './application/space-ventilation.service';

@Module({
  controllers: [SpaceVentilationController],
  providers: [SpaceVentilationService],
})
export class SpaceVentilationModule {}
