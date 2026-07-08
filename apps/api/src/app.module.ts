import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CadGeometryModule } from './modules/cad-geometry/cad-geometry.module';
import { CadSemanticsModule } from './modules/cad-semantics/cad-semantics.module';
import { CadModule } from './modules/cad/cad.module';
import { CatalogImportModule } from './modules/catalog-import/catalog-import.module';
import { DocumentModule } from './modules/document/document.module';
import { ErvDesignModule } from './modules/erv-design/erv-design.module';
import { HealthModule } from './modules/health/health.module';
import { RuleStudioModule } from './modules/rule-studio/rule-studio.module';
import { SpaceVentilationModule } from './modules/space-ventilation/space-ventilation.module';
import { ObservabilityModule } from './observability/observability.module';
import { RequestObservabilityMiddleware } from './observability/request-observability.middleware';
import { RequestPolicyMiddleware } from './security/request-policy.middleware';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    SecurityModule,
    ObservabilityModule,
    HealthModule,
    RuleStudioModule,
    CatalogImportModule,
    SpaceVentilationModule,
    CadGeometryModule,
    CadSemanticsModule,
    CadModule,
    DocumentModule,
    ErvDesignModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestObservabilityMiddleware, RequestPolicyMiddleware)
      .forRoutes('*');
  }
}
