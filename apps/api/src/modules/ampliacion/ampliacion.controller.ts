import { Body, Controller, Get, Param, Patch, Post, Put, Req } from '@nestjs/common';
import { Public, Roles } from '../auth/auth.metadata.js';
import type { AuthRequest } from '../auth/auth.types.js';
import { AmpliacionService } from './ampliacion.service.js';

@Controller('ampliacion')
export class AmpliacionController {
  constructor(private readonly service: AmpliacionService) {}

  @Roles('DOCENTE', 'ESTUDIANTE')
  @Get('mi-horario')
  miHorario(@Req() req: AuthRequest) {
    return this.service.miHorario(req.actor!);
  }

  @Roles('ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE')
  @Get('grupos/:id/horarios')
  horarios(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.horariosGrupo(id, req.actor!);
  }

  @Roles('ADMINISTRADOR')
  @Put('grupos/:id/horarios')
  reemplazarHorarios(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthRequest) {
    return this.service.reemplazarHorarios(id, body, req.actor!);
  }

  @Roles('ESTUDIANTE')
  @Get('mapa-curricular')
  mapa(@Req() req: AuthRequest) {
    return this.service.mapaCurricular(req.actor!);
  }

  @Roles('DOCENTE', 'ADMINISTRADOR')
  @Get('grupos/:id/evaluaciones')
  evaluaciones(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.evaluacionesGrupo(id, req.actor!);
  }

  @Roles('DOCENTE')
  @Post('grupos/:id/evaluaciones')
  crearEvaluacion(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthRequest) {
    return this.service.crearEvaluacion(id, body, req.actor!);
  }

  @Roles('DOCENTE')
  @Put('evaluaciones/:id/nota')
  nota(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthRequest) {
    return this.service.capturarNotaEvaluacion(id, body, req.actor!);
  }

  @Roles('ESTUDIANTE')
  @Get('mis-evaluaciones')
  misEvaluaciones(@Req() req: AuthRequest) {
    return this.service.misEvaluaciones(req.actor!);
  }

  @Roles('ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE')
  @Get('notificaciones')
  notificaciones(@Req() req: AuthRequest) {
    return this.service.misNotificaciones(req.actor!);
  }

  @Roles('ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE')
  @Patch('notificaciones/:id/leida')
  leer(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.leerNotificacion(id, req.actor!);
  }

  @Roles('DOCENTE')
  @Get('grupos/:id/sesiones')
  sesiones(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.sesionesGrupo(id, req.actor!);
  }

  @Roles('DOCENTE')
  @Post('grupos/:id/sesiones')
  crearSesion(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthRequest) {
    return this.service.crearSesion(id, body, req.actor!);
  }

  @Roles('DOCENTE')
  @Put('sesiones/:id/asistencias')
  registrarAsistencia(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthRequest) {
    return this.service.registrarAsistencia(id, body, req.actor!);
  }

  @Roles('ESTUDIANTE')
  @Get('mi-asistencia')
  miAsistencia(@Req() req: AuthRequest) {
    return this.service.miAsistencia(req.actor!);
  }

  @Roles('ADMINISTRADOR')
  @Patch('periodos/:id/cancelacion')
  configurarCancelacion(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthRequest) {
    return this.service.configurarCancelacionPeriodo(id, body, req.actor!);
  }

  @Roles('ADMINISTRADOR')
  @Get('indicadores')
  indicadores() {
    return this.service.indicadores();
  }

  @Roles('ADMINISTRADOR')
  @Get('alertas')
  alertas() {
    return this.service.alertas();
  }

  @Roles('ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE')
  @Patch('perfil')
  perfil(@Body() body: unknown, @Req() req: AuthRequest) {
    return this.service.actualizarPerfil(body, req.actor!);
  }

  @Roles('ADMINISTRADOR')
  @Post('usuarios/:id/recuperacion')
  generarRecuperacion(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.generarRecuperacion(id, req.actor!);
  }

  @Public()
  @Post('recuperar-acceso')
  recuperarAcceso(@Body() body: unknown) {
    return this.service.completarRecuperacion(body);
  }
}
