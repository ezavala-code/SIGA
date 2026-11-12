import type { Request } from 'express';
import type { Rol } from '../../generated/prisma/enums.js';

export interface AuthActor {
  userId: string;
  sessionId: string;
  rol: Rol;
  correo: string;
}

export type AuthRequest = Request & { actor?: AuthActor };
