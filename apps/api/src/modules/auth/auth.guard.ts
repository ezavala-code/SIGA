import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { Rol } from '../../generated/prisma/enums.js';
import { ENVIRONMENT, type Environment } from '../../config/environment.js';
import { allowedOrigin } from '../../config/origin.js';
import { AuthService } from './auth.service.js';
import { PUBLIC_ROUTE, REQUIRED_ROLES, SELF_OR_ADMIN } from './auth.metadata.js';
import type { AuthRequest } from './auth.types.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthRequest>();
    const response = http.getResponse<Response>();
    this.checkBrowserSource(request);
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, targets)) return true;
    response?.setHeader?.('Cache-Control', 'no-store');

    const values = (request.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.startsWith('siga_session='));
    if (values.length !== 1) throw new UnauthorizedException('Inicia sesión.');
    const token = values[0]!.slice('siga_session='.length);
    const actor = await this.auth.authenticate(token);
    if (!actor) throw new UnauthorizedException('Sesión inválida o vencida.');
    request.actor = actor;

    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      !this.auth.validCsrf(actor.sessionId, request.headers['x-csrf-token'])
    ) {
      throw new ForbiddenException('Falta la protección de la solicitud.');
    }
    const roles = this.reflector.getAllAndOverride<Rol[]>(REQUIRED_ROLES, targets);
    if (roles && !roles.includes(actor.rol)) throw new ForbiddenException('Acceso no permitido.');
    if (
      this.reflector.getAllAndOverride<boolean>(SELF_OR_ADMIN, targets) &&
      actor.rol !== 'ADMINISTRADOR' &&
      request.params.id !== actor.userId
    ) {
      throw new ForbiddenException('Acceso no permitido.');
    }
    return true;
  }

  private checkBrowserSource(request: Request) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
    const origin = request.headers.origin;
    if (origin && !allowedOrigin(origin, this.environment)) {
      throw new ForbiddenException('Origen no permitido.');
    }
    if (request.headers['sec-fetch-site'] === 'cross-site') {
      throw new ForbiddenException('Origen no permitido.');
    }
  }
}
