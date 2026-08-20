import { Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict, CLERK_SERVICE, IClerkService, InviteRoleNotAllowedException, LocationAccessDeniedException, LocationNotFoundException } from '../../../../../common';
import { LOCATION_REPO, ROLE_REPO } from '../../../../constants';
import { ILocationRepo } from '../../../locations';
import { IRoleRepo } from '../../../roles';
import { ERole } from '../../../../../infrastructure/persistence/entities/role.entity';
import { InviteUserCommand } from './invite-user.command';

@CommandHandlerStrict(InviteUserCommand)
export class InviteUserCommandHandler implements ICommandHandler<InviteUserCommand, void> {
  constructor(
    @Inject(CLERK_SERVICE) private readonly clerkService: IClerkService,
    @Inject(ROLE_REPO) private readonly roleRepo: IRoleRepo,
    @Inject(LOCATION_REPO) private readonly locationRepo: ILocationRepo,
    @InjectPinoLogger(InviteUserCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: InviteUserCommand): Promise<void> {
    this.logger.info(`Executing ${InviteUserCommand.name} email=${command.email}`);

    if (!command.organizationId) {
      throw new InviteRoleNotAllowedException(undefined, 'Select an organization to invite this user into.');
    }

    const role = await this.roleRepo.getAsync(command.roleId);
    if (!role || role.name === (ERole.SuperAdmin as string)) {
      throw new InviteRoleNotAllowedException();
    }

    if (command.locationId) {
      const location = await this.locationRepo.getAsync(command.locationId);
      if (!location) throw new LocationNotFoundException(command.locationId);
      if (location.organizationId !== command.organizationId) {
        throw new LocationAccessDeniedException(undefined, 'Location does not belong to your organization.');
      }
    }

    await this.clerkService.inviteUserAsync({
      email:          command.email,
      roles:          command.roles,
      redirectUrl:    command.redirectUrl,
      organizationId: command.organizationId,
      roleId:         command.roleId,
      locationId:     command.locationId,
    });
  }
}
