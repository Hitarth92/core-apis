import { Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict, LocationAccessDeniedException, LocationNotFoundException, UserNotFoundException } from '../../../../../common';
import { LOCATION_REPO, ROLE_REPO, USER_REPO, USER_ROLE_REPO } from '../../../../constants';
import { ILocationRepo } from '../../../locations';
import { IRoleRepo } from '../../../roles';
import { IUserRepo } from '../../../users';
import { UserRole } from '../../domain';
import { IUserRoleRepo } from '../..';
import { assertRoleGrant } from '../../assert-role-grant';
import { CreateUserRoleCommand } from './create-user-role.command';

@CommandHandlerStrict(CreateUserRoleCommand)
export class CreateUserRoleCommandHandler implements ICommandHandler<CreateUserRoleCommand, UserRole> {
  constructor(
    @Inject(USER_ROLE_REPO) private readonly repo: IUserRoleRepo,
    @Inject(USER_REPO) private readonly userRepo: IUserRepo,
    @Inject(ROLE_REPO) private readonly roleRepo: IRoleRepo,
    @Inject(LOCATION_REPO) private readonly locationRepo: ILocationRepo,
    @InjectPinoLogger(CreateUserRoleCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: CreateUserRoleCommand): Promise<UserRole> {
    this.logger.info(`Executing ${CreateUserRoleCommand.name}`);

    await assertRoleGrant(this.userRepo, this.roleRepo, {
      userId: command.userId,
      roleId: command.roleId,
      organizationId: command.organizationId,
      callerIsSuperAdmin: command.callerIsSuperAdmin,
    });

    if (command.locationId) {
      await this.assertLocationBelongsToUsersOrg(command.userId, command.locationId);
    }

    const userRole = new UserRole();
    userRole.userId = command.userId;
    userRole.roleId = command.roleId;
    userRole.locationId = command.locationId;
    return this.repo.createAsync(userRole);
  }

  private async assertLocationBelongsToUsersOrg(userId: string, locationId: string): Promise<void> {
    const [user, location] = await Promise.all([this.userRepo.getAsync(userId), this.locationRepo.getAsync(locationId)]);
    if (!user) throw new UserNotFoundException(userId);
    if (!location) throw new LocationNotFoundException(locationId);
    if (location.organizationId !== user.organizationId) {
      throw new LocationAccessDeniedException(undefined, 'Location does not belong to the same organization as the user.');
    }
  }
}
