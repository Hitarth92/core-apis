import { Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  AllowAnonymous,
  AuthenticatedUser,
  ClerkAuthGuard,
  CqrsMediator,
  CurrentUser,
  isDev,
  isLocal,
  isTest,
} from '../../../common';
import { SyncUserCommand } from './commands/sync-user';
import { OnboardOrganizationCommand, OnboardOrganizationResult } from './commands/onboard-organization';
import { GetMeQuery, MeResult } from './queries/get-me';
import { GetTokenQuery } from './queries/get-token';
import {
  GetTokenRequest,
  OnboardOrganizationRequest,
  MeResponse,
  SyncUserResponse,
  OnboardOrganizationResponse,
  TokenResponse,
  OrganizationSummary,
  MembershipSummary,
} from './models';
import { User } from '../users/domain';

@ApiBearerAuth()
@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
@UseGuards(ClerkAuthGuard)
export class AuthController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(AuthController.name) protected readonly logger: PinoLogger,
  ) {}

  // ── POST /auth/token (dev only) ─────────────────────────────────────────────
  @ApiOperation({
    summary: 'Get a Clerk JWT for a user (development only)',
    description: 'Finds the most recent active Clerk session for the given user ID and returns a signed JWT.',
  })
  @ApiCreatedResponse({ type: TokenResponse })
  @HttpCode(HttpStatus.CREATED)
  @AllowAnonymous()
  @Post('token')
  public async getToken(@Body() body: GetTokenRequest): Promise<TokenResponse> {
    if (!isDev() && !isLocal() && !isTest()) {
      throw new ForbiddenException('Token minting is disabled outside development');
    }
    const query   = new GetTokenQuery();
    query.userId  = body.userId;
    const token = await this.mediator.execute<GetTokenQuery, string>(query);
    return { token };
  }

  // ── POST /auth/sync ─────────────────────────────────────────────────────────
  @ApiOperation({
    summary: 'Sync Clerk user to the database (JIT provisioning)',
    description:
      'Call this immediately after sign-in. Creates or updates the local user record from the Clerk JWT claims.',
  })
  @ApiCreatedResponse({ type: SyncUserResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post('sync')
  public async sync(@CurrentUser() currentUser: AuthenticatedUser): Promise<SyncUserResponse> {
    const command = new SyncUserCommand();
    command.clerkUserId = currentUser.clerkUserId;
    command.email = currentUser.email;
    command.firstName = currentUser.firstName;
    command.lastName = currentUser.lastName;
    command.imageUrl = currentUser.imageUrl;

    const user = await this.mediator.execute<SyncUserCommand, User>(command);

    return {
      id: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      organizationId: user.organizationId,
    };
  }

  // ── POST /auth/organizations ─────────────────────────────────────────────────
  @ApiOperation({
    summary: 'Create an organization and set the caller as OrgAdmin',
    description:
      'Onboarding step: creates the org in our DB, assigns the caller as OrgAdmin via org_members, and links their primary organizationId.',
  })
  @ApiCreatedResponse({ type: OnboardOrganizationResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post('organizations')
  public async onboardOrganization(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: OnboardOrganizationRequest,
  ): Promise<OnboardOrganizationResponse> {
    if (!currentUser.organizationId) {
      const syncCmd = new SyncUserCommand();
      syncCmd.clerkUserId = currentUser.clerkUserId;
      syncCmd.email = currentUser.email;
      syncCmd.firstName = currentUser.firstName;
      syncCmd.lastName = currentUser.lastName;
      syncCmd.imageUrl = currentUser.imageUrl;
      const syncedUser = await this.mediator.execute<SyncUserCommand, User>(syncCmd);
      currentUser.dbUserId = syncedUser.id;
      currentUser.organizationId = syncedUser.organizationId;
    }

    const command = new OnboardOrganizationCommand();
    command.clerkUserId = currentUser.clerkUserId;
    command.dbUserId = currentUser.dbUserId;
    command.name = body.name;
    command.slug = body.slug;
    command.clerkOrgId = body.clerkOrgId;
    command.logoUrl = body.logoUrl;

    const result = await this.mediator.execute<OnboardOrganizationCommand, OnboardOrganizationResult>(command);

    return {
      organizationId: result.organization.id,
      organizationName: result.organization.name,
      membershipId: result.membership.id,
      role: result.roleName,
    };
  }

  // ── GET /auth/me ─────────────────────────────────────────────────────────────
  @ApiOperation({
    summary: 'Get current user profile with org and role (session enrichment)',
    description:
      'Returns the full user context: user data, primary organization, and org membership with role.',
  })
  @ApiOkResponse({ type: MeResponse })
  @HttpCode(HttpStatus.OK)
  @Get('me')
  public async getMe(@CurrentUser() currentUser: AuthenticatedUser): Promise<MeResponse> {
    if (!currentUser.isOnboarded) {
      return {
        id: null,
        clerkUserId: currentUser.clerkUserId,
        email: currentUser.email,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        avatarUrl: currentUser.imageUrl,
        roles: [],
        isOnboarded: false,
        organization: undefined,
        membership: undefined,
        locationIds: [],
        hasOrgWideAccess: false,
      };
    }

    const query = new GetMeQuery();
    query.clerkUserId = currentUser.clerkUserId;
    const result = await this.mediator.execute<GetMeQuery, MeResult>(query);

    let orgSummary: OrganizationSummary | undefined;
    if (result.organization) {
      orgSummary = {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        logoUrl: result.organization.logoUrl,
      };
    }

    let membershipSummary: MembershipSummary | undefined;
    if (result.membership) {
      membershipSummary = {
        id: result.membership.id,
        roleId: result.membership.roleId,
        status: result.membership.status,
        joinedAt: result.membership.joinedAt,
      };
    }

    return {
      id: result.user.id,
      clerkUserId: result.user.clerkUserId,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      avatarUrl: result.user.avatarUrl,
      roles: currentUser.roles,
      isOnboarded: true,
      organization: orgSummary,
      membership: membershipSummary,
      locationIds: currentUser.locationIds ?? [],
      hasOrgWideAccess: currentUser.hasOrgWideAccess ?? false,
      currencyCode: resolveCurrencyCode(result.organization?.country),
    };
  }
}

function resolveCurrencyCode(country?: string): string {
  const c = (country ?? '').toLowerCase();
  if (c.includes('kenya') || c === 'ke') return 'KES';
  if (c.includes('india') || c === 'in') return 'INR';
  if (c.includes('united states') || c === 'us' || c === 'usa') return 'USD';
  return 'KES';
}
