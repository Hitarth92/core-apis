export * from './create-user-role';
export * from './update-user-role';
import { CreateUserRoleCommandHandler } from './create-user-role';
import { UpdateUserRoleCommandHandler } from './update-user-role';
export const UserRoleCommandHandlers = [CreateUserRoleCommandHandler, UpdateUserRoleCommandHandler];
