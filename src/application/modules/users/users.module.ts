import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CLERK_SERVICE, ClerkService } from '../../../common';
import { UsersController } from './users.controller';
import { UserCommandHandlers } from './commands';
import { UserQueryHandlers } from './queries';
import { UserProfile } from './mapper';
import { ErpRoleLookupService } from './services';

@Module({
  imports:     [CqrsModule],
  controllers: [UsersController],
  providers:   [
    { provide: CLERK_SERVICE, useClass: ClerkService },
    ...UserCommandHandlers,
    ...UserQueryHandlers,
    UserProfile,
    ErpRoleLookupService,
  ],
})
export class UsersModule {}
