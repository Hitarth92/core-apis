import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ERole } from '../../../infrastructure/persistence/entities/role.entity';
import { ROLES_META_KEY } from '../constants';
import { AuthenticatedUser } from '../types';
import { shouldAllowAnonymous } from './should-allow-anonymous';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    if (shouldAllowAnonymous(context, this.reflector)) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<ERole[]>(ROLES_META_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user?.isOnboarded) {
      throw new ForbiddenException('User is not onboarded. Call POST /auth/sync first.');
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. Your roles: ${user.roles.join(', ')}`,
      );
    }

    return true;
  }
}
