import { locationIdIfOwnedByOrg, parseInviteMetadata } from './invite-metadata';

describe('parseInviteMetadata', () => {
  it('returns org, role, and optional store from publicMetadata.invite', () => {
    expect(
      parseInviteMetadata({
        invite: { organizationId: 'org-1', roleId: 'role-1', locationId: 'loc-1' },
      }),
    ).toEqual({ organizationId: 'org-1', roleId: 'role-1', locationId: 'loc-1' });
  });

  it('returns undefined when invite org or role is missing', () => {
    expect(parseInviteMetadata({})).toBeUndefined();
    expect(parseInviteMetadata({ invite: { organizationId: 'org-1' } })).toBeUndefined();
    expect(parseInviteMetadata(null)).toBeUndefined();
  });
});

describe('locationIdIfOwnedByOrg', () => {
  it('keeps a store that belongs to the org', () => {
    expect(locationIdIfOwnedByOrg({ organizationId: 'org-1' }, 'org-1', 'loc-1')).toBe('loc-1');
  });

  it('drops a missing or foreign store so the hire still joins org-wide', () => {
    expect(locationIdIfOwnedByOrg(undefined, 'org-1', 'loc-1')).toBeUndefined();
    expect(locationIdIfOwnedByOrg({ organizationId: 'other' }, 'org-1', 'loc-1')).toBeUndefined();
    expect(locationIdIfOwnedByOrg({ organizationId: 'org-1' }, 'org-1', undefined)).toBeUndefined();
  });
});
