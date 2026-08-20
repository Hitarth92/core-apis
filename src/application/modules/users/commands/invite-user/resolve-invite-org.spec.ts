import { resolveInviteOrganizationId } from './resolve-invite-org';

describe('resolveInviteOrganizationId', () => {
  it('uses the caller org for a non-SuperAdmin', () => {
    expect(
      resolveInviteOrganizationId({
        callerIsSuperAdmin: false,
        callerOrganizationId: 'org-caller',
        requestedOrganizationId: 'org-body',
      }),
    ).toBe('org-caller');
  });

  it('uses the requested org for SuperAdmin', () => {
    expect(
      resolveInviteOrganizationId({
        callerIsSuperAdmin: true,
        callerOrganizationId: undefined,
        requestedOrganizationId: 'org-body',
      }),
    ).toBe('org-body');
  });

  it('returns undefined when SuperAdmin omits an org', () => {
    expect(
      resolveInviteOrganizationId({
        callerIsSuperAdmin: true,
        callerOrganizationId: undefined,
        requestedOrganizationId: undefined,
      }),
    ).toBeUndefined();
  });
});
