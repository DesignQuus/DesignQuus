import { Injectable, NotFoundException } from '@nestjs/common';
import { ErvDesignRepository } from './erv-design.repository';
import type { CreateErvDesignRunDto } from '../presentation/create-erv-design-run.dto';

@Injectable()
export class ErvDesignService {
  constructor(private readonly repository: ErvDesignRepository) {}

  create(tenantId: string, input: CreateErvDesignRunDto) {
    return this.repository.create({ tenantId, ...input });
  }

  async get(tenantId: string, id: string) {
    const run = await this.repository.findById(tenantId, id);
    if (!run) throw new NotFoundException('ERV design run not found');
    return run;
  }
}
