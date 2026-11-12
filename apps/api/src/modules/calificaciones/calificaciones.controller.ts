import { Body, Controller, Get, Param, Patch, Put, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/auth.metadata.js';
import type { AuthRequest } from '../auth/auth.types.js';
import { CalificacionesService } from './calificaciones.service.js';

@Roles('DOCENTE')
@Controller('docentes/me/grupos')
export class DocenteCalificacionesController {
  constructor(private readonly calificaciones: CalificacionesService) {}

  @Get(':grupoId/calificaciones')
  grupo(@Param('grupoId') grupoId: string, @Query() query: unknown, @Req() request: AuthRequest) {
    return this.calificaciones.grupoDocente(grupoId, query, request.actor!);
  }
}

@Roles('DOCENTE')
@Controller('calificaciones')
export class CalificacionesController {
  constructor(private readonly calificaciones: CalificacionesService) {}

  @Put(':inscripcionId')
  actualizar(
    @Param('inscripcionId') inscripcionId: string,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.calificaciones.actualizar(inscripcionId, body, request.actor!);
  }

  @Patch(':inscripcionId')
  corregir(
    @Param('inscripcionId') inscripcionId: string,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.calificaciones.actualizar(inscripcionId, body, request.actor!);
  }

  @Patch('inscripciones/:inscripcionId')
  corregirInscripcion(
    @Param('inscripcionId') inscripcionId: string,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.calificaciones.actualizar(inscripcionId, body, request.actor!);
  }

  @Put('inscripciones/:inscripcionId')
  actualizarInscripcion(
    @Param('inscripcionId') inscripcionId: string,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.calificaciones.actualizar(inscripcionId, body, request.actor!);
  }
}

@Roles('ESTUDIANTE')
@Controller('estudiantes/me')
export class EstudianteCalificacionesController {
  constructor(private readonly calificaciones: CalificacionesService) {}

  @Get('calificaciones')
  propias(@Req() request: AuthRequest) {
    return this.calificaciones.calificacionesEstudiante(request.actor!);
  }

  @Get('progreso')
  progreso(@Req() request: AuthRequest) {
    return this.calificaciones.progresoEstudiante(request.actor!);
  }
}
