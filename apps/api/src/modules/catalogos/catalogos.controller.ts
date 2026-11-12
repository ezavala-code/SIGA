import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/auth.metadata.js';
import type { AuthRequest } from '../auth/auth.types.js';
import { CatalogosService } from './catalogos.service.js';

@Roles('ADMINISTRADOR')
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Get('programas')
  programas(@Query() query: unknown) {
    return this.catalogos.programas(query);
  }

  @Post('programas')
  crearPrograma(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.catalogos.crearPrograma(body, request.actor!);
  }

  @Patch('programas/:id')
  actualizarPrograma(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthRequest) {
    return this.catalogos.actualizarPrograma(id, body, request.actor!);
  }

  @Get('asignaturas')
  asignaturas(@Query() query: unknown) {
    return this.catalogos.asignaturas(query);
  }

  @Post('asignaturas')
  crearAsignatura(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.catalogos.crearAsignatura(body, request.actor!);
  }

  @Patch('asignaturas/:id')
  actualizarAsignatura(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    return this.catalogos.actualizarAsignatura(id, body, request.actor!);
  }

  @Get('planes')
  planes(@Query() query: unknown) {
    return this.catalogos.planes(query);
  }

  @Post('planes')
  crearPlan(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.catalogos.crearPlan(body, request.actor!);
  }

  @Get('planes/:id')
  plan(@Param('id') id: string) {
    return this.catalogos.plan(id);
  }

  @Patch('planes/:id')
  actualizarPlan(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthRequest) {
    return this.catalogos.actualizarPlan(id, body, request.actor!);
  }

  @Post('planes/:id/nueva-version')
  nuevaVersion(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.catalogos.nuevaVersion(id, request.actor!);
  }

  @Put('planes/:id/contenido')
  contenidoPlan(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthRequest) {
    return this.catalogos.contenidoPlan(id, body, request.actor!);
  }
}
