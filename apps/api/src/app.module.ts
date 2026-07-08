import { HealthModule } from './modules/health/health.module';
import { RuleStudioModule } from './modules/rule-studio/rule-studio.module';
import { CatalogImportModule } from './modules/catalog-import/catalog-import.module';
import { SpaceVentilationModule } from './modules/space-ventilation/space-ventilation.module';
import { CadGeometryModule } from './modules/cad-geometry/cad-geometry.module';
import { CadModule } from './modules/cad/cad.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { DocumentModule } from './modules/document/document.module';
import { ErvDesignModule } from './modules/erv-design/erv-design.module';
import { CadSemanticsModule } from './modules/cad-semantics/cad-semantics.module';

@Module({
  imports: [HealthModule, RuleStudioModule, CatalogImportModule, SpaceVentilationModule, CadGeometryModule, CadSemanticsModule, CadModule, 
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    DocumentModule,
    ErvDesignModule,
  ],
})
export class AppModule {}
