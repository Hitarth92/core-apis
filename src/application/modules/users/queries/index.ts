export * from './get-user';
export * from './list-users';
export * from './list-user-directory';
export * from './search-users';
export * from './get-user-roles';
export * from './list-invitations';
export * from './list-organizations';

import { GetUserQueryHandler }            from './get-user';
import { ListUsersQueryHandler }          from './list-users';
import { ListUserDirectoryQueryHandler }  from './list-user-directory';
import { SearchUsersQueryHandler }        from './search-users';
import { GetUserRolesQueryHandler }       from './get-user-roles';
import { ListInvitationsQueryHandler }    from './list-invitations';
import { ListOrganizationsQueryHandler }  from './list-organizations';

export const UserQueryHandlers = [
  GetUserQueryHandler,
  ListUsersQueryHandler,
  ListUserDirectoryQueryHandler,
  SearchUsersQueryHandler,
  GetUserRolesQueryHandler,
  ListInvitationsQueryHandler,
  ListOrganizationsQueryHandler,
];
