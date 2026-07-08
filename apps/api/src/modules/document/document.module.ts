import { Module } from '@nestjs/common';
import { StorageService } from '../../storage/storage.service';
import { DocumentRepository } from './application/document.repository';
import { ExtractionRepository } from './application/extraction.repository';
import { ImportJobRepository } from './application/import-job.repository';
import { SpacePromotionRepository } from './application/space-promotion.repository';
import { DocumentService } from './application/document.service';
import { ExtractionService } from './application/extraction.service';
import { ImportJobService } from './application/import-job.service';
import { SpacePromotionService } from './application/space-promotion.service';
import { PostgresDocumentRepository } from './infrastructure/postgres-document.repository';
import { PostgresExtractionRepository } from './infrastructure/postgres-extraction.repository';
import { PostgresImportJobRepository } from './infrastructure/postgres-import-job.repository';
import { PostgresSpacePromotionRepository } from './infrastructure/postgres-space-promotion.repository';
import { DocumentController } from './presentation/document.controller';

@Module({
  controllers: [DocumentController],
  providers: [
    StorageService,
    DocumentService,
    ExtractionService,
    ImportJobService,
    SpacePromotionService,
    { provide: DocumentRepository, useClass: PostgresDocumentRepository },
    { provide: ExtractionRepository, useClass: PostgresExtractionRepository },
    { provide: ImportJobRepository, useClass: PostgresImportJobRepository },
    { provide: SpacePromotionRepository, useClass: PostgresSpacePromotionRepository },
  ],
})
export class DocumentModule {}
