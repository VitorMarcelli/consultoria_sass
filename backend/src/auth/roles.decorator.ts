import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restringe um endpoint a uma ou mais roles (ex: @Roles('ADMIN')). Deve ser
 * combinado com @UseGuards(JwtAuthGuard, RolesGuard) — o RolesGuard lê esses
 * metadados e compara com request.user.role, populado pelo JwtAuthGuard.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
