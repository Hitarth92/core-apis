import { computeHasOrgWideAccess } from './org-wide-access';

describe('computeHasOrgWideAccess', () => {
  it('is org-wide when any user_role has no store', () => {
    expect(computeHasOrgWideAccess([{ locationId: null }], 1)).toBe(true);
  });

  it('is store-scoped when the only user_role has a store, even with org_members', () => {
    expect(computeHasOrgWideAccess([{ locationId: 'loc-1' }], 1)).toBe(false);
  });

  it('is org-wide for onboarded OrgAdmin with membership but no user_roles yet', () => {
    expect(computeHasOrgWideAccess([], 1)).toBe(true);
  });

  it('is not org-wide with neither membership nor roles', () => {
    expect(computeHasOrgWideAccess([], 0)).toBe(false);
  });
});
