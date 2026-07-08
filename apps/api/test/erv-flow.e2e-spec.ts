import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Pool } from 'pg';
import { join } from 'node:path';
import { AppModule } from '../src/app.module';

const tenantId = process.env.TEST_TENANT_ID;
const projectId = process.env.TEST_PROJECT_ID;
const revisionId = process.env.TEST_REVISION_ID;
const fileVersionId = process.env.TEST_FILE_VERSION_ID;
const maybeDescribe = tenantId && projectId && revisionId && fileVersionId ? describe : describe.skip;

maybeDescribe('ERV integrated flow', () => {
  let app: INestApplication;
  let pool: Pool;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(async () => { await pool.end(); await app.close(); });

  it('uploads, queues import, reviews extraction, and persists ERV run', async () => {
    const upload = await request(app.getHttpServer())
      .post('/v1/files/upload')
      .set('x-tenant-id', tenantId!)
      .set('Idempotency-Key', 'e2e-upload-001')
      .field('projectId', projectId!)
      .field('projectRevisionId', revisionId!)
      .field('fileType', 'PDF')
      .attach('file', join(__dirname, '../../../tests/fixtures/sample-plan.pdf'))
      .expect(201);

    const importJob = await request(app.getHttpServer())
      .post('/v1/import-jobs')
      .set('x-tenant-id', tenantId!)
      .set('Idempotency-Key', 'e2e-import-001')
      .send({ projectId, projectRevisionId: revisionId, sourceFileVersionId: upload.body.fileVersionId, importType: 'DRAWING_AI' })
      .expect(201);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO document.extractions (
          tenant_id, project_id, project_revision_id, import_job_id, object_type,
          raw_value, normalized_value, confidence_score, source_page
        ) VALUES ($1,$2,$3,$4,'ROOM_NAME','대회의실','CONFERENCE_ROOM',0.97,1)
        RETURNING id`,
        [tenantId, projectId, revisionId, importJob.body.importJobId],
      );
      await client.query('COMMIT');

      await request(app.getHttpServer())
        .get(`/v1/import-jobs/${importJob.body.importJobId}/extractions`)
        .set('x-tenant-id', tenantId!)
        .expect(200)
        .expect(({ body }) => { if (body.length !== 1) throw new Error('Expected one extraction'); });

      await request(app.getHttpServer())
        .post(`/v1/extractions/${inserted.rows[0].id}/review`)
        .set('x-tenant-id', tenantId!)
        .send({ decision: 'ACCEPTED' })
        .expect(201);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    const created = await request(app.getHttpServer())
      .post('/v1/erv-design-runs')
      .set('x-tenant-id', tenantId!)
      .send({ projectId, projectRevisionId: revisionId, sourceFileVersionId: fileVersionId })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/v1/erv-design-runs/${created.body.id}`)
      .set('x-tenant-id', tenantId!)
      .expect(200);
  });
});
