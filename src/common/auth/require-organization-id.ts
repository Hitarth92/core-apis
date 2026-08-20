import { ForbiddenException } from '@nestjs/common';

export function requireOrganizationId(user?: { organizationId?: string }): string {
  if (!user?.organizationId) {
    throw new ForbiddenException('Organization is required. Complete onboarding first.');
  }
  return user.organizationId;
}

export function requireDbUserId(user?: { dbUserId?: string }): string {
  if (!user?.dbUserId) {
    throw new ForbiddenException('User is not onboarded. Call POST /auth/sync first.');
  }
  return user.dbUserId;
}
