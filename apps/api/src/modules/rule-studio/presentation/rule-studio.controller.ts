import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RuleStudioService } from '../application/rule-studio.service';

@Controller('rule-studio')
export class RuleStudioController {
  constructor(private readonly service: RuleStudioService) {}

  @Post('drafts')
  createDraft(@Body() body: unknown) {
    return this.service.createDraft(body);
  }

  @Post('drafts/:id/compile')
  compileDraft(@Param('id') id: string) {
    return this.service.compileDraft(id);
  }

  @Post('drafts/:id/test-runs')
  runTests(@Param('id') id: string) {
    return this.service.runTests(id);
  }

  @Get('test-runs/:id')
  getTestRun(@Param('id') id: string) {
    return { id };
  }

  @Post('applicability-runs')
  analyzeApplicability(@Body() body: unknown) {
    return this.service.analyzeApplicability(body);
  }

  @Get('applicability-runs/:id/items')
  getApplicabilityItems(@Param('id') id: string) {
    return { id, items: [] };
  }
}
