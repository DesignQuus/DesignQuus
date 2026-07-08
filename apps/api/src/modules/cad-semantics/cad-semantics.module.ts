import { Module } from '@nestjs/common';
import { CadSemanticsController } from './presentation/cad-semantics.controller';
import { CadSemanticsService } from './application/cad-semantics.service';

@Module({
  controllers: [CadSemanticsController],
  providers: [CadSemanticsService],
})
export class CadSemanticsModule {}
