import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';

export interface StoredObject {
  storageKey: string;
  sha256: string;
  sizeBytes: number;
}

@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('LOCAL_STORAGE_ROOT') ?? './.local-storage');
  }

  async persistTempFile(tempPath: string, originalName: string): Promise<StoredObject> {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(tempPath)) hash.update(chunk);
    const sha256 = hash.digest('hex');
    const sizeBytes = (await stat(tempPath)).size;
    const safeExt = extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const storageKey = join('uploads', sha256.slice(0, 2), `${randomUUID()}${safeExt}`);
    const target = join(this.root, storageKey);
    await mkdir(dirname(target), { recursive: true });
    await rename(tempPath, target);
    return { storageKey, sha256, sizeBytes };
  }

  openReadStream(storageKey: string) {
    return createReadStream(join(this.root, storageKey));
  }

  async remove(storageKey: string): Promise<void> {
    await rm(join(this.root, storageKey), { force: true });
  }
}
