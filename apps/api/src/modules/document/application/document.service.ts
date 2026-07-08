import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { extname } from 'node:path';
import { StorageService } from '../../../storage/storage.service';
import { DocumentRepository } from './document.repository';

type FileType = 'DWG' | 'DXF' | 'PDF' | 'IFC' | 'IMAGE';

const EXTENSION_TYPES: Record<string, FileType> = {
  '.dwg': 'DWG', '.dxf': 'DXF', '.pdf': 'PDF', '.ifc': 'IFC',
  '.png': 'IMAGE', '.jpg': 'IMAGE', '.jpeg': 'IMAGE', '.webp': 'IMAGE',
};

@Injectable()
export class DocumentService {
  constructor(
    private readonly storage: StorageService,
    private readonly documents: DocumentRepository,
  ) {}

  async openVersion(tenantId: string, fileVersionId: string) {
    const meta = await this.documents.getFileVersionContent(tenantId, fileVersionId);
    if (!meta) throw new NotFoundException('File version not found');
    return { ...meta, stream: this.storage.openReadStream(meta.storageKey) };
  }

  async upload(input: {
    tenantId: string;
    projectId: string;
    projectRevisionId: string;
    fileType: FileType;
    file: Express.Multer.File;
    idempotencyKey?: string;
  }) {
    const extension = extname(input.file.originalname).toLowerCase();
    const expectedType = EXTENSION_TYPES[extension];
    if (!expectedType) throw new BadRequestException(`Unsupported file extension: ${extension}`);
    if (expectedType !== input.fileType) {
      throw new BadRequestException(`fileType ${input.fileType} does not match ${extension}`);
    }

    const stored = await this.storage.persistTempFile(input.file.path, input.file.originalname);
    try {
      return await this.documents.createUploadedDocument({
        tenantId: input.tenantId,
        projectId: input.projectId,
        projectRevisionId: input.projectRevisionId,
        fileName: input.file.filename,
        originalFileName: input.file.originalname,
        fileType: input.fileType,
        mimeType: input.file.mimetype || 'application/octet-stream',
        sizeBytes: stored.sizeBytes,
        storageKey: stored.storageKey,
        sha256Hash: stored.sha256,
        idempotencyKey: input.idempotencyKey,
      });
    } catch (error) {
      await this.storage.remove(stored.storageKey);
      throw error;
    }
  }
}
