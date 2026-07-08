import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ErvDesignRepository } from '../application/erv-design.repository';
import type { ErvDesignRun } from '../domain/erv-design-run';

@Injectable()
export class InMemoryErvDesignRepository extends ErvDesignRepository {
  private readonly runs = new Map<string, ErvDesignRun>();
  async create(input: {projectId:string; projectRevisionId:string; sourceFileVersionId:string}): Promise<ErvDesignRun> {
    const run: ErvDesignRun = {id:randomUUID(), ...input, status:'CREATED', currentStep:'DRAWING', createdAt:new Date().toISOString()};
    this.runs.set(run.id, run);
    return run;
  }
  async findById(id: string): Promise<ErvDesignRun | null> { return this.runs.get(id) ?? null; }
}
