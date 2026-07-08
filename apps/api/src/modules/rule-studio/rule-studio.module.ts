import { Module } from '@nestjs/common';
import { RuleStudioController } from './presentation/rule-studio.controller';
import { RuleStudioService } from './application/rule-studio.service';

@Module({
  controllers: [RuleStudioController],
  providers: [RuleStudioService],
})
export class RuleStudioModule {}
