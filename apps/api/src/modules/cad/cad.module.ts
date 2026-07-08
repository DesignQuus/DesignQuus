import { Module } from '@nestjs/common';
import { CadController } from './presentation/cad.controller';
import { CadService } from './application/cad.service';

@Module({
  controllers: [CadController],
  providers: [CadService],
})
export class CadModule {}
