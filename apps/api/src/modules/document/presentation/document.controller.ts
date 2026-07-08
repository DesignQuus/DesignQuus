import {
  Body,
  Controller,
  Get,
  Headers,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { diskStorage } from 'multer';
import { TenantId } from '../../../common/tenant';
import { Roles } from '../../../security/roles.decorator';
import { DocumentService } from '../application/document.service';
import { ExtractionService } from '../application/extraction.service';
import type { ReviewDecision } from '../application/extraction.repository';
import { ImportJobService } from '../application/import-job.service';
import { SpacePromotionService } from '../application/space-promotion.service';

const uploadTempDir = join(tmpdir(), 'hvac-upload');
mkdirSync(uploadTempDir, { recursive: true });

@Controller()
export class DocumentController {
  constructor(
    private readonly documents: DocumentService,
    private readonly extractions: ExtractionService,
    private readonly importJobs: ImportJobService,
    private readonly promotions: SpacePromotionService,
  ) {}

  @Post('files/upload')
  @Roles('OPERATOR', 'ENGINEER', 'ADMINISTRATOR')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadTempDir,
        filename: (_req, _file, cb) => cb(null, randomUUID()),
      }),
      limits: { fileSize: 200 * 1024 * 1024 },
    }),
  )
  upload(
    @TenantId() tenantId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body()
    body: {
      projectId: string;
      projectRevisionId: string;
      fileType: 'DWG' | 'DXF' | 'PDF' | 'IFC' | 'IMAGE';
    },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 200 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.documents.upload({
      tenantId,
      ...body,
      file,
      idempotencyKey,
    });
  }

  @Get('file-versions/:fileVersionId/content')
  @Roles('OPERATOR', 'ENGINEER', 'APPROVER', 'ADMINISTRATOR')
  async fileContent(
    @TenantId() tenantId: string,
    @Param('fileVersionId') fileVersionId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.documents.openVersion(tenantId, fileVersionId);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.sizeBytes));
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(file.originalFileName)}`,
    );
    return new StreamableFile(file.stream);
  }

  @Post('import-jobs')
  @Roles('OPERATOR', 'ENGINEER', 'ADMINISTRATOR')
  createImportJob(
    @TenantId() tenantId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body()
    body: {
      projectId: string;
      projectRevisionId: string;
      sourceFileVersionId: string;
      importType: 'DRAWING_AI' | 'CAD_OBJECT' | 'IFC' | 'OCR';
    },
  ) {
    return this.importJobs.create({ tenantId, ...body, idempotencyKey });
  }

  @Get('import-jobs/:jobId/extractions')
  @Roles('OPERATOR', 'ENGINEER', 'APPROVER', 'ADMINISTRATOR')
  listExtractions(
    @TenantId() tenantId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.extractions.list(tenantId, jobId);
  }

  @Post('import-jobs/:jobId/promote-spaces')
  @Roles('ENGINEER', 'APPROVER', 'ADMINISTRATOR')
  promoteSpaces(
    @TenantId() tenantId: string,
    @Param('jobId') jobId: string,
    @Body() body: { floorId: string; createdBy?: string },
  ) {
    return this.promotions.promote({
      tenantId,
      importJobId: jobId,
      floorId: body.floorId,
      createdBy: body.createdBy,
    });
  }

  @Post('extractions/:extractionId/review')
  @Roles('ENGINEER', 'APPROVER', 'ADMINISTRATOR')
  reviewExtraction(
    @TenantId() tenantId: string,
    @Param('extractionId') extractionId: string,
    @Body()
    body: {
      decision: ReviewDecision;
      correctedValue?: string;
      reviewedBy?: string;
    },
  ) {
    return this.extractions.review({ tenantId, extractionId, ...body });
  }
}
