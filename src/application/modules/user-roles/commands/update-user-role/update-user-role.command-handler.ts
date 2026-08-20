import { Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict, LocationAccessDeniedException, LocationNotFoundException, UserNotFoundException, UserRoleNotFoundException } from '../../../../../common';
import { LOCATION_REPO, ROLE_REPO, USER_REPO, USER_ROLE_REPO } from '../../../../constants';
import { ILocationRepo } from '../../../locations';
import { IRoleRepo } from '../../../roles';
import { IUserRepo } from '../../../users';
import { UserRole } from '../../domain';
import { IUserRoleRepo } from '../..';
import { assertRoleGrant } from '../../assert-role-grant';
import { UpdateUserRoleCommand } from './update-user-role.command';

@CommandHandlerStrict(UpdateUserRoleCommand)
export class UpdateUserRoleCommandHandler implements ICommandHandler<UpdateUserRoleCommand, UserRole> {
  constructor(
    @Inject(USER_ROLE_REPO) private readonly repo: IUserRoleRepo,
    @Inject(USER_REPO) private readonly userRepo: IUserRepo,
    @Inject(ROLE_REPO) private readonly roleRepo: IRoleRepo,
    @Inject(LOCATION_REPO) private readonly locationRepo: ILocationRepo,
    @InjectPinoLogger(UpdateUserRoleCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: UpdateUserRoleCommand): Promise<UserRole> {
    this.logger.info(`Executing ${UpdateUserRoleCommand.name}`);

    const existing = await this.repo.getAsync(command.id);
    if (!existing) throw new UserRoleNotFoundException(command.id);

    await assertRoleGrant(this.userRepo, this.roleRepo, {
      userId: existing.userId,
      roleId: command.roleId ?? existing.roleId,
      organizationId: command.organizationId,
      callerIsSuperAdmin: command.callerIsSuperAdmin,
    });

    if (command.locationId) {
      await this.assertLocationBelongsToUsersOrg(existing.userId, command.locationId);
    }

    const updated = new UserRole();
    updated.id = existing.id;
    updated.userId = existing.userId;
    updated.roleId = command.roleId ?? existing.roleId;
    // updateAsync (base.repo.ts) skips undefined-valued columns on save: omitted locationId leaves it
    // unchanged, an explicit null clears it. Do not add a default here — that's what implements
    // the endpoint's "omit = unchanged, null = clear" contract.
    updated.locationId = command.locationId;
    return this.repo.updateAsync(updated);
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
