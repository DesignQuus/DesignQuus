import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CadSemanticsService } from '../application/cad-semantics.service';

@Controller('cad-semantics')
export class CadSemanticsController {
  constructor(private readonly service: CadSemanticsService) {}

  @Post('layer-classification-runs')
  classifyLayers(@Body() body: unknown) {
    return this.service.queue('CAD_LAYER_CLASSIFY', body);
  }

  @Post('room-detection-runs')
  detectRooms(@Body() body: unknown) {
    return this.service.queue('CAD_ROOM_DETECT', body);
  }

  @Post('ai-cad-match-runs')
  matchAiCad(@Body() body: unknown) {
    return this.service.queue('AI_CAD_MATCH', body);
  }

  @Get('ai-cad-match-runs/:id/candidates')
  candidates(@Param('id') id: string) {
    return { matchRunId: id, candidates: [] };
  }
}
