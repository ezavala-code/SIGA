import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/auth.metadata.js';
import type { AuthRequest } from '../auth/auth.types.js';
import { PersonasService } from './personas.service.js';

@Roles('ADMINISTRADOR')
@Controller('personas')
export class PersonasController {
  constructor(private readonly personas: PersonasService) {}

  @Get('estudiantes')
  estudiantes(@Query() query: unknown) {
    return this.personas.estudiantes(query);
  }

  @Post('estudiantes')
  crearEstudiante(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.personas.crearEstudiante(body, request.actor!);
  }

  @Patch('estudiantes/:id')
  actualizarEstudiante(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.personas.actualizarEstudiante(id, body, request.actor!);
  }

  @Get('docentes')
  docentes(@Query() query: unknown) {
    return this.personas.docentes(query);
  }

  @Post('docentes')
  crearDocente(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.personas.crearDocente(body, request.actor!);
  }

  @Patch('docentes/:id')
  actualizarDocente(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthRequest) {
    return this.personas.actualizarDocente(id, body, request.actor!);
  }
}
