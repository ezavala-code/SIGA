import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ENVIRONMENT, type Environment } from '../../config/environment.js';
import { AuthService } from './auth.service.js';
import { LoginLimiter } from './login-limiter.service.js';
import { Public, Roles, SelfOrAdmin } from './auth.metadata.js';
import type { AuthRequest } from './auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(LoginLimiter) private readonly limiter: LoginLimiter,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Headers('content-type') contentType: string | undefined,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    if (!contentType?.toLowerCase().startsWith('application/json')) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    const email =
      typeof body === 'object' &&
      body !== null &&
      'correo' in body &&
      typeof body.correo === 'string'
        ? body.correo.trim().toLowerCase()
        : '';
    const ip = request.ip ?? request.socket.remoteAddress ?? 'desconocida';
    this.limiter.assertAllowed(ip, email);
    try {
      const result = await this.auth.login(body);
      this.limiter.succeeded(ip, email);
      response.cookie('siga_session', result.token, {
        httpOnly: true,
        secure: this.environment.COOKIE_SECURE,
        sameSite: 'strict',
        path: '/',
        maxAge: this.environment.JWT_TTL_SECONDS * 1000,
      });
      return {
        usuario: { id: result.actor.userId, correo: result.actor.correo, rol: result.actor.rol },
        csrfToken: result.csrfToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) this.limiter.failed(ip, email);
      throw error;
    }
  }

  @Get('me')
  me(@Req() request: AuthRequest) {
    return this.auth.profile(request.actor!);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.actor!);
    response.clearCookie('siga_session', {
      httpOnly: true,
      secure: this.environment.COOKIE_SECURE,
      sameSite: 'strict',
      path: '/',
    });
    response.setHeader('Cache-Control', 'no-store');
  }

  @Roles('ADMINISTRADOR')
  @Get('usuarios')
  users(@Query() query: unknown) {
    return this.auth.users(query);
  }

  @SelfOrAdmin()
  @Get('usuarios/:id')
  async user(@Param('id') id: string) {
    const result = await this.auth.user(id);
    if (!result) throw new NotFoundException('Cuenta no encontrada.');
    return result;
  }
}
