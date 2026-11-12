import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/auth.metadata.js';
import type { AuthRequest } from '../auth/auth.types.js';
import { MatriculasService } from './matriculas.service.js';

@Roles('ESTUDIANTE')
@Controller('matriculas')
export class MatriculasController {
  constructor(private readonly matriculas: MatriculasService) {}

  @Get('me')
  propias(@Req() request: AuthRequest, @Query() query: unknown) {
    return this.matriculas.propias(request.actor!, query);
  }

  @Get('oferta')
  oferta(@Req() request: AuthRequest, @Query() query: unknown) {
    return this.matriculas.oferta(request.actor!, query);
  }

  @Get('lista-espera')
  listas(@Req() request: AuthRequest) {
    return this.matriculas.misListasEspera(request.actor!);
  }

  @Post('lista-espera')
  esperar(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.matriculas.unirseListaEspera(body, request.actor!);
  }

  @Delete('lista-espera/:id')
  salir(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.matriculas.salirListaEspera(id, request.actor!);
  }

  @Delete(':id')
  cancelar(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.matriculas.cancelarInscripcion(id, request.actor!);
  }

  @Post()
  crear(@Body() body: unknown, @Req() request: AuthRequest) {
    return this.matriculas.crear(body, request.actor!);
  }
}
