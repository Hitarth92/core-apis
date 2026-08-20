import { Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CommandHandlerStrict, CLERK_SERVICE, IClerkService, locationIdIfOwnedByOrg } from '../../../../../common';
import { LOCATION_REPO, USER_REPO } from '../../../../constants';
import { User } from '../../../users/domain';
import { IUserRepo } from '../../../users';
import { ILocationRepo } from '../../../locations';
import { UserEntity, UserRoleEntity, OrgMemberEntity } from '../../../../../infrastructure/persistence/entities';
import { SyncUserCommand } from './sync-user.command';
import { AuthMailService } from '../../mail';

@CommandHandlerStrict(SyncUserCommand)
export class SyncUserCommandHandler implements ICommandHandler<SyncUserCommand, User> {
  constructor(
    @Inject(USER_REPO) private readonly userRepo: IUserRepo,
    @Inject(LOCATION_REPO) private readonly locationRepo: ILocationRepo,
    @Inject(CLERK_SERVICE) private readonly clerkService: IClerkService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mailService: AuthMailService,
    @InjectPinoLogger(SyncUserCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: SyncUserCommand): Promise<User> {
    this.logger.info({ clerkUserId: command.clerkUserId }, 'Syncing Clerk user to DB');

    let user = await this.userRepo.upsertByClerkIdAsync(command.clerkUserId, {
      email:     command.email,
      firstName: command.firstName,
      lastName:  command.lastName,
      avatarUrl: command.imageUrl,
      isActive:  true,
    });

    const isNewUser = !user.updatedAt || Math.abs(
      new Date(user.updatedAt).getTime() - new Date(user.createdAt).getTime(),
    ) < 10_000;

    if (!user.organizationId) {
      let organizationId = command.organizationId;
      let roleId = command.roleId;
      let locationId = command.locationId;
      if (!organizationId || !roleId) {
        const invite = await this.clerkService.getInviteMetadataAsync(command.clerkUserId);
        if (invite) {
          organizationId = invite.organizationId;
          roleId = invite.roleId;
          locationId = locationId ?? invite.locationId;
        }
      }
      if (organizationId && roleId) {
        if (locationId) {
          const location = await this.locationRepo.getAsync(locationId).catch(() => undefined);
          const owned = locationIdIfOwnedByOrg(location ?? undefined, organizationId, locationId);
          if (!owned) {
            this.logger.warn({ locationId }, 'Invite store no longer belongs to org — applying org-wide');
          }
          locationId = owned;
        }
        await this.applyInvite(user.id, organizationId, roleId, locationId);
        user = await this.userRepo.getAsync(user.id);
      }
    }

    if (isNewUser && command.email) {
      this.mailService.sendTemplatedAsync(command.email, 'welcome', {
        firstName: command.firstName ?? 'there',
        email:     command.email,
      }).catch((err: Error) =>
        this.logger.warn({ error: err.message }, 'Welcome mail failed — non-fatal'),
      );
    }

    return user;
  }

  private async applyInvite(
    userId: string,
    organizationId: string,
    roleId: string,
    locationId?: string,
  ): Promise<void> {
    this.logger.info({ userId, organizationId }, 'Applying invite: linking org and role');
    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(UserEntity, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked || locked.organizationId) return;

      locked.organizationId = organizationId;
      await manager.save(UserEntity, locked);

      const existingRole = await manager.findOne(UserRoleEntity, { where: { userId } });
      if (!existingRole) {
        await manager.save(UserRoleEntity, manager.create(UserRoleEntity, { userId, roleId, locationId }));
      }

      const existingMember = await manager.findOne(OrgMemberEntity, { where: { userId, organizationId } });
      if (!existingMember) {
        await manager.save(OrgMemberEntity, manager.create(OrgMemberEntity, {
          organizationId,
          userId,
          roleId,
          status: 'active',
          joinedAt: new Date(),
        }));
      }
    });
  }
}
