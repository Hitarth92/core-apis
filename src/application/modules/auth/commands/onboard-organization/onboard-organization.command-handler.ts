import { Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict, OrganizationNotFoundException } from '../../../../../common';
import { ORGANIZATION_REPO, ROLE_REPO, USER_REPO, ORG_MEMBER_REPO } from '../../../../constants';
import { Organization } from '../../../organizations/domain';
import { IOrganizationRepo } from '../../../organizations';
import { IUserRepo } from '../../../users';
import { IRoleRepo } from '../../../roles';
import { ERole } from '../../../../../infrastructure/persistence/entities/role.entity';
import { IOrgMemberRepo } from '../../i-org-member.repo';
import { OrgMember } from '../../domain';
import { OnboardOrganizationCommand } from './onboard-organization.command';

export class OnboardOrganizationResult {
  organization: Organization;
  membership: OrgMember;
  roleName: string;
}

@CommandHandlerStrict(OnboardOrganizationCommand)
export class OnboardOrganizationCommandHandler
  implements ICommandHandler<OnboardOrganizationCommand, OnboardOrganizationResult>
{
  constructor(
    @Inject(ORGANIZATION_REPO) private readonly orgRepo: IOrganizationRepo,
    @Inject(USER_REPO) private readonly userRepo: IUserRepo,
    @Inject(ROLE_REPO) private readonly roleRepo: IRoleRepo,
    @Inject(ORG_MEMBER_REPO) private readonly orgMemberRepo: IOrgMemberRepo,
    @InjectPinoLogger(OnboardOrganizationCommandHandler.name)
    private readonly logger: PinoLogger,
  ) {}

  public async execute(command: OnboardOrganizationCommand): Promise<OnboardOrganizationResult> {
    this.logger.info({ dbUserId: command.dbUserId }, 'Onboarding organization');

    const existingUser = await this.userRepo.getAsync(command.dbUserId);
    if (existingUser?.organizationId) {
      const organization = await this.orgRepo.getAsync(existingUser.organizationId);
      if (!organization) throw new OrganizationNotFoundException(existingUser.organizationId);
      const membership = await this.orgMemberRepo.findByUserAndOrgAsync(existingUser.id, existingUser.organizationId);
      if (!membership) {
        throw new OrganizationNotFoundException(existingUser.organizationId);
      }
      const roles = await this.roleRepo.allAsync();
      const roleName = roles.find((r) => r.id === membership.roleId)?.name ?? '';
      return { organization, membership, roleName };
    }

    const completedSteps: string[] = [];
    let org: Organization | undefined;

    try {
      // Step 1 — create organization
      org = await this.orgRepo.createAsync({
        name: command.name,
        slug: command.slug,
        clerkOrgId: command.clerkOrgId,
        logoUrl: command.logoUrl,
        isActive: true,
      } as unknown as Organization);
      completedSteps.push('org_created');

      // Step 2 — resolve the OrgAdmin role
      const roles = await this.roleRepo.allAsync();
      const orgAdminRole = roles.find((r) => r.name === String(ERole.OrgAdmin));
      if (!orgAdminRole) throw new Error('OrgAdmin role not found in DB — run seeds first');
      completedSteps.push('role_resolved');

      // Step 3 — link user's primary org
      const user = await this.userRepo.getAsync(command.dbUserId);
      await this.userRepo.updateAsync({ ...user, organizationId: org.id });
      completedSteps.push('user_org_linked');

      // Step 4 — create org membership with OrgAdmin role
      const membership = await this.orgMemberRepo.createAsync({
        organizationId: org.id,
        userId: command.dbUserId,
        roleId: orgAdminRole.id,
        status: 'active',
        joinedAt: new Date(),
      } as unknown as OrgMember);
      completedSteps.push('membership_created');

      return { organization: org, membership, roleName: orgAdminRole.name };
    } catch (err) {
      this.logger.error({ err, completedSteps }, 'Onboarding failed, rolling back completed steps');

      // Rollback in reverse — only steps that need cleanup
      if (completedSteps.includes('membership_created')) {
        // Membership will cascade-delete if org is removed
      }
      if (completedSteps.includes('user_org_linked')) {
        const user = await this.userRepo.getAsync(command.dbUserId).catch(() => null);
        if (user) await this.userRepo.updateAsync({ ...user, organizationId: null });
      }
      if (completedSteps.includes('org_created') && org) {
        await this.orgRepo.deleteAsync(org.id, true);
      }

      throw err;
    }
  }
}
