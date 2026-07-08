import { Module } from '@nestjs/common';
import { ErvDesignService } from './application/erv-design.service';
import { ErvDesignRepository } from './application/erv-design.repository';
import { PostgresErvDesignRepository } from './infrastructure/postgres-erv-design.repository';
import { ErvDesignController } from './presentation/erv-design.controller';

@Module({
  controllers: [ErvDesignController],
  providers: [
    ErvDesignService,
    { provide: ErvDesignRepository, useClass: PostgresErvDesignRepository },
  ],
})
export class ErvDesignModule {}
