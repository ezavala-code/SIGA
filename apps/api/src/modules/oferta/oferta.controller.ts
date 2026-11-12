import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/auth.metadata.js';
import type { AuthRequest } from '../auth/auth.types.js';
import { OfertaService } from './oferta.service.js';

@Roles('ADMINISTRADOR')
@Controller('periodos')
export class PeriodosController {
  constructor(private readonly oferta: OfertaService) {}

  @Get('politicas')
  politicas() {
    return this.oferta.politicas();
  }

  @Get()
  periodos(@Query() query: unknown) {
    return this.oferta.periodos(query);
  }

  @Post()
  crear(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.oferta.crearPeriodo(body, request.actor!);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthRequest) {
    return this.oferta.actualizarPeriodo(id, body, request.actor!);
  }
}

@Roles('ADMINISTRADOR')
@Controller('grupos')
export class GruposController {
  constructor(private readonly oferta: OfertaService) {}

  @Get()
  grupos(@Query() query: unknown) {
    return this.oferta.grupos(query);
  }

  @Post()
  crear(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.oferta.crearGrupo(body, request.actor!);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthRequest) {
    return this.oferta.actualizarGrupo(id, body, request.actor!);
  }
}

@Roles('DOCENTE')
@Controller('docentes/me')
export class DocenteGruposController {
  constructor(private readonly oferta: OfertaService) {}

  @Get('grupos')
  grupos(@Req() request: AuthRequest, @Query() query: unknown) {
    return this.oferta.gruposDocente(request.actor!, query);
  }
}
