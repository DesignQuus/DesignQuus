import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SpaceVentilationService } from '../application/space-ventilation.service';

@Controller('space-ventilation')
export class SpaceVentilationController {
  constructor(private readonly service: SpaceVentilationService) {}

  @Post('spaces/:spaceId/profiles/resolve')
  resolveProfile(
    @Param('spaceId') spaceId: string,
    @Body() body: unknown,
  ) {
    return {
      spaceId,
      ...this.service.resolveProfile(body),
    };
  }

  @Get('spaces/:spaceId/profiles/current')
  getCurrentProfile(@Param('spaceId') spaceId: string) {
    return { spaceId };
  }

  @Post('runs')
  createRun(@Body() body: unknown) {
    return this.service.createRun(body);
  }

  @Get('runs/:runId')
  getRun(@Param('runId') runId: string) {
    return { runId };
  }

  @Get('runs/:runId/items')
  getRunItems(@Param('runId') runId: string) {
    return { runId, items: [] };
  }

  @Post('rule-parameters/:parameterId/verify')
  verifyParameter(
    @Param('parameterId') parameterId: string,
    @Body() body: { verificationStatus?: string },
  ) {
    return {
      parameterId,
      ...this.service.approveRuleParameter(body),
    };
  }
}
