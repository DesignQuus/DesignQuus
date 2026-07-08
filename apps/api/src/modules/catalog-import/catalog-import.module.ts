import { Module } from '@nestjs/common';
import { CatalogImportController } from './presentation/catalog-import.controller';
import { CatalogImportService } from './application/catalog-import.service';

@Module({
  controllers: [CatalogImportController],
  providers: [CatalogImportService],
})
export class CatalogImportModule {}
