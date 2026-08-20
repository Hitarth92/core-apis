import { ForbiddenException } from '@nestjs/common';
import { requireDbUserId, requireOrganizationId } from './require-organization-id';

describe('requireOrganizationId', () => {
  it('returns the organization id when present', () => {
    expect(requireOrganizationId({ organizationId: 'org-1' })).toBe('org-1');
  });

  it('throws ForbiddenException when the session has no org', () => {
    expect(() => requireOrganizationId({})).toThrow(ForbiddenException);
    expect(() => requireOrganizationId(undefined)).toThrow(ForbiddenException);
  });
});

describe('requireDbUserId', () => {
  it('returns the db user id when present', () => {
    expect(requireDbUserId({ dbUserId: 'user-1' })).toBe('user-1');
  });

  it('throws ForbiddenException when the user is not onboarded', () => {
    expect(() => requireDbUserId({})).toThrow(ForbiddenException);
  });
});
