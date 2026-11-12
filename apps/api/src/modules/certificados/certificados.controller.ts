import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
} from '@nestjs/common';
import { Public, Roles } from '../auth/auth.metadata.js';
import type { AuthRequest } from '../auth/auth.types.js';
import { CertificadosService } from './certificados.service.js';
import { ReportesService } from '../reportes/reportes.service.js';

@Controller('certificados')
export class CertificadosController {
  constructor(private readonly certificados: CertificadosService) {}

  @Roles('ESTUDIANTE')
  @Get('me')
  @Header('Cache-Control', 'private, no-store')
  propios(@Req() request: AuthRequest) {
    return this.certificados.listarPropios(request.actor!);
  }

  @Roles('ESTUDIANTE')
  @Post()
  emitir(@Req() request: AuthRequest) {
    return this.certificados.emitirPropio(request.actor!);
  }

  @Roles('ESTUDIANTE')
  @Post('conclusion')
  concluir(@Req() request: AuthRequest) {
    return this.certificados.emitirPropio(request.actor!, 'CONCLUSION');
  }

  @Roles('ADMINISTRADOR')
  @Post('estudiantes/:estudianteId/conclusion')
  concluirEstudiante(@Param('estudianteId') id: string, @Req() request: AuthRequest) {
    return this.certificados.emitirParaEstudiante(id, request.actor!, 'CONCLUSION');
  }

  @Roles('ADMINISTRADOR')
  @Post('estudiantes/:estudianteId')
  emitirParaEstudiante(@Param('estudianteId') estudianteId: string, @Req() request: AuthRequest) {
    return this.certificados.emitirParaEstudiante(estudianteId, request.actor!);
  }

  @Roles('ESTUDIANTE', 'ADMINISTRADOR')
  @Post(':id/recuperar')
  recuperar(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.certificados.recuperar(id, request.actor!);
  }

  @Roles('ESTUDIANTE', 'ADMINISTRADOR')
  @Post(':id/reemitir')
  reemitir(@Param('id') id: string, @Req() request: AuthRequest) {
    return this.certificados.reemitir(id, request.actor!);
  }

  @Roles('ADMINISTRADOR')
  @Get()
  @Header('Cache-Control', 'private, no-store')
  administracion(@Query() query: unknown) {
    return this.certificados.listarAdministracion(query);
  }

  @Roles('ADMINISTRADOR')
  @Post(':id/revocar')
  revocar(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthRequest) {
    return this.certificados.revocar(id, body, request.actor!);
  }

  @Roles('ESTUDIANTE', 'ADMINISTRADOR')
  @Get(':id/pdf')
  @Header('Cache-Control', 'private, no-store')
  async descargar(@Param('id') id: string, @Req() request: AuthRequest) {
    const file = await this.certificados.descargarPdf(id, request.actor!);
    return new StreamableFile(file.bytes, {
      type: 'application/pdf',
      disposition: `attachment; filename="constancia-${file.codigo}.pdf"`,
      length: file.bytes.length,
    });
  }

  @Public()
  @Get('verificar/:codigo')
  @Header('Cache-Control', 'no-store')
  verificar(@Param('codigo') codigo: string) {
    return this.certificados.verificar(codigo);
  }
}

@Roles('ADMINISTRADOR', 'DOCENTE')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Roles('ADMINISTRADOR')
  @Get('grupos')
  @Header('Cache-Control', 'private, no-store')
  grupos(@Query() query: unknown) {
    return this.reportes.grupos(query);
  }

  @Get('grupos/:grupoId/historial.csv')
  @Header('Cache-Control', 'no-store')
  async historial(@Param('grupoId') grupoId: string, @Req() request: AuthRequest) {
    const report = await this.reportes.historialCsv(grupoId, request.actor!);
    return new StreamableFile(Buffer.from(report.content, 'utf8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${report.nombreArchivo}"`,
    });
  }

  @Roles('ADMINISTRADOR')
  @Get('auditoria')
  @Header('Cache-Control', 'private, no-store')
  auditoria(@Query() query: unknown) {
    return this.reportes.auditoria(query);
  }
}
