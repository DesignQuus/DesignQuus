import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from './database.constants';
import { TenantTransaction } from './tenant-transaction';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Pool => {
        const connectionString = config.get<string>('DATABASE_URL');
        if (!connectionString) throw new Error('DATABASE_URL is required');
        return new Pool({ connectionString, max: 10 });
      },
    },
    TenantTransaction,
  ],
  exports: [PG_POOL, TenantTransaction],
})
export class DatabaseModule {}
