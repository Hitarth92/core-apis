import { SyncUserCommandHandler } from './sync-user';
import { OnboardOrganizationCommandHandler } from './onboard-organization';

export * from './sync-user';
export * from './onboard-organization';

export const AuthCommandHandlers = [
  SyncUserCommandHandler,
  OnboardOrganizationCommandHandler,
];
