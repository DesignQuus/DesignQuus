import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'ai-hvac-engineering-os-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
