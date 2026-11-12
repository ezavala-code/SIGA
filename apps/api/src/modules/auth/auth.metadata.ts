import { SetMetadata } from '@nestjs/common';
import type { Rol } from '../../generated/prisma/enums.js';

export const PUBLIC_ROUTE = 'siga:public';
export const REQUIRED_ROLES = 'siga:roles';
export const SELF_OR_ADMIN = 'siga:self-or-admin';

export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const Roles = (...roles: Rol[]) => SetMetadata(REQUIRED_ROLES, roles);
export const SelfOrAdmin = () => SetMetadata(SELF_OR_ADMIN, true);
