import { AmpliacionController } from './modules/ampliacion/ampliacion.controller.js';
import { AmpliacionService } from './modules/ampliacion/ampliacion.service.js';
import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ENVIRONMENT, type Environment } from './config/environment.js';
import { DatabaseService } from './database/database.service.js';
import { HealthController } from './modules/health/health.controller.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { AuthGuard } from './modules/auth/auth.guard.js';
import { AuthService } from './modules/auth/auth.service.js';
import { LoginLimiter } from './modules/auth/login-limiter.service.js';
import { CatalogosController } from './modules/catalogos/catalogos.controller.js';
import { CatalogosService } from './modules/catalogos/catalogos.service.js';
import { PersonasController } from './modules/personas/personas.controller.js';
import { PersonasService } from './modules/personas/personas.service.js';
import {
  DocenteGruposController,
  GruposController,
  PeriodosController,
} from './modules/oferta/oferta.controller.js';
import { OfertaService } from './modules/oferta/oferta.service.js';
import { MatriculasController } from './modules/matriculas/matriculas.controller.js';
import { MatriculasService } from './modules/matriculas/matriculas.service.js';
import {
  CalificacionesController,
  DocenteCalificacionesController,
  EstudianteCalificacionesController,
} from './modules/calificaciones/calificaciones.controller.js';
import { CalificacionesService } from './modules/calificaciones/calificaciones.service.js';
import {
  CertificadosController,
  ReportesController,
} from './modules/certificados/certificados.controller.js';
import { CertificadosService } from './modules/certificados/certificados.service.js';
import { ReportesService } from './modules/reportes/reportes.service.js';

@Module({})
export class AppModule {
  static register(environment: Environment): DynamicModule {
    return {
      module: AppModule,
      controllers: [
        AmpliacionController,
        HealthController,
        AuthController,
        CatalogosController,
        PersonasController,
        PeriodosController,
        GruposController,
        DocenteGruposController,
        MatriculasController,
        DocenteCalificacionesController,
        CalificacionesController,
        EstudianteCalificacionesController,
        CertificadosController,
        ReportesController,
      ],
      providers: [
        { provide: ENVIRONMENT, useValue: environment },
        DatabaseService,
        AmpliacionService,
        AuthService,
        LoginLimiter,
        CatalogosService,
        PersonasService,
        OfertaService,
        MatriculasService,
        CalificacionesService,
        CertificadosService,
        ReportesService,
        { provide: APP_GUARD, useClass: AuthGuard },
      ],
    };
  }
}
