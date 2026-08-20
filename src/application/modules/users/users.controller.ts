import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards, ParseEnumPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, CqrsMediator, Roles, RolesGuard, AuthenticatedUser, CurrentUser, assertOrgOwnership } from '../../../common';
import { resolveInviteOrganizationId } from './commands/invite-user';
import { ERole } from '../../../infrastructure';
import {
  AssignUserToOrgCommand,
  BanUserCommand,
  CreateUserCommand,
  DeleteUserCommand,
  InviteUserCommand,
  RemoveUserFromOrgCommand,
  RevokeInvitationCommand,
  UnbanUserCommand,
  UpdateUserRolesCommand,
} from './commands';
import { User } from './domain';
import {
  AssignUserToOrgRequest,
  CreateUserRequest,
  InviteUserRequest,
  ListUsersRequest,
  SearchUsersRequest,
  UpdateUserRolesRequest,
} from './models';
import {
  ClerkInvitationResponse,
  ClerkOrganizationResponse,
  ClerkUserListResponse,
  ClerkUserRolesResponse,
  UserResponse,
} from './models';
import {
  GetUserQuery,
  GetUserRolesQuery,
  ListInvitationsQuery,
  ListOrganizationsQuery,
  ListUsersQuery,
  SearchUsersQuery,
} from './queries';
import { EInvitationStatus } from '../../../infrastructure/e-invitation-status';

@ApiBearerAuth()
@ApiTags('Users')
@Controller({ path: 'users', version: '1' })
@UseGuards(ClerkAuthGuard)
export class UsersController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(UsersController.name) protected readonly logger: PinoLogger,
  ) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all users (Clerk)' })
  @ApiOkResponse({ type: ClerkUserListResponse })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Get()
  public async list(
    @Query() params: ListUsersRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClerkUserListResponse> {
    const query              = new ListUsersQuery();
    query.limit              = params.limit;
    query.offset             = params.offset;
    const isSuperAdmin       = user.roles?.includes(ERole.SuperAdmin);
    const clerkOrgId         = user.clerkOrgId;
    // Clerk listUsers expects org_xxx, not our DB organization UUID.
    if (isSuperAdmin) {
      query.organizationId = params.organizationId?.startsWith('org_')
        ? params.organizationId
        : clerkOrgId;
    } else if (clerkOrgId) {
      query.organizationId = clerkOrgId;
    } else {
      throw new ForbiddenException('No active Clerk organization on this session');
    }
    return this.mediator.execute<ListUsersQuery, ClerkUserListResponse>(query);
  }

  @ApiOperation({ summary: 'Search users by name / email (Clerk)' })
  @ApiOkResponse({ type: ClerkUserListResponse })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Get('search')
  public async search(@Query() params: SearchUsersRequest): Promise<ClerkUserListResponse> {
    const query    = new SearchUsersQuery();
    query.query    = params.query;
    query.limit    = params.limit;
    query.offset   = params.offset;
    return this.mediator.execute<SearchUsersQuery, ClerkUserListResponse>(query);
  }

  @ApiOperation({ summary: 'Get user by local DB ID' })
  @ApiOkResponse({ type: UserResponse })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<UserResponse> {
    const query = new GetUserQuery();
    query.id    = id;
    const result = await this.mediator.execute<GetUserQuery, User>(query);
    assertOrgOwnership(user, result.organizationId, 'user');
    return this.mapper.map(result, User, UserResponse);
  }

  @ApiOperation({ summary: 'Get Clerk roles for a user' })
  @ApiOkResponse({ type: ClerkUserRolesResponse })
  @ApiParam({ name: 'clerkUserId', description: 'Clerk user ID (user_xxx)' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Get('clerk/:clerkUserId/roles')
  public async getRoles(@Param('clerkUserId') clerkUserId: string): Promise<ClerkUserRolesResponse> {
    const query         = new GetUserRolesQuery();
    query.clerkUserId   = clerkUserId;
    return this.mediator.execute<GetUserRolesQuery, ClerkUserRolesResponse>(query);
  }

  @ApiOperation({ summary: 'List Clerk organizations' })
  @ApiOkResponse({ type: [ClerkOrganizationResponse] })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Get('clerk/organizations')
  public async listOrganizations(): Promise<ClerkOrganizationResponse[]> {
    const query = new ListOrganizationsQuery();
    return this.mediator.execute<ListOrganizationsQuery, ClerkOrganizationResponse[]>(query);
  }

  // ─── Commands ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({ type: UserResponse })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Post()
  public async create(@Body() body: CreateUserRequest): Promise<UserResponse> {
    const command = this.mapper.map(body, CreateUserRequest, CreateUserCommand);
    const result  = await this.mediator.execute<CreateUserCommand, User>(command);
    return this.mapper.map(result, User, UserResponse);
  }

  @ApiOperation({ summary: 'Invite a user via Clerk email invitation' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Post('clerk/invite')
  public async invite(@CurrentUser() currentUser: AuthenticatedUser, @Body() body: InviteUserRequest): Promise<void> {
    const command = this.mapper.map(body, InviteUserRequest, InviteUserCommand);
    command.organizationId = resolveInviteOrganizationId({
      callerIsSuperAdmin: currentUser.roles?.includes(ERole.SuperAdmin) ?? false,
      callerOrganizationId: currentUser.organizationId,
      requestedOrganizationId: body.organizationId,
    });
    await this.mediator.execute<InviteUserCommand, void>(command);
  }

  @ApiOperation({ summary: 'List Clerk invitations (optionally filtered by status)' })
  @ApiOkResponse({ type: [ClerkInvitationResponse] })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Get('clerk/invitations')
  public async listInvitations(
    @Query('status', new ParseEnumPipe(EInvitationStatus, { optional: true })) status?: EInvitationStatus,
  ): Promise<ClerkInvitationResponse[]> {
    const query    = new ListInvitationsQuery();
    query.status   = status;
    return this.mediator.execute<ListInvitationsQuery, ClerkInvitationResponse[]>(query);
  }

  @ApiOperation({ summary: 'Revoke a pending Clerk invitation' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete('clerk/invitations/:invitationId')
  public async revokeInvitation(@Param('invitationId') invitationId: string): Promise<void> {
    const command             = new RevokeInvitationCommand();
    command.invitationId      = invitationId;
    await this.mediator.execute<RevokeInvitationCommand, void>(command);
  }

  @ApiOperation({ summary: 'Update Clerk roles for a user' })
  @ApiNoContentResponse()
  @ApiParam({ name: 'clerkUserId', description: 'Clerk user ID (user_xxx)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Put('clerk/:clerkUserId/roles')
  public async updateRoles(
    @Param('clerkUserId') clerkUserId: string,
    @Body() body: UpdateUserRolesRequest,
  ): Promise<void> {
    const command           = this.mapper.map(body, UpdateUserRolesRequest, UpdateUserRolesCommand);
    command.clerkUserId     = clerkUserId;
    await this.mediator.execute<UpdateUserRolesCommand, void>(command);
  }

  @ApiOperation({ summary: 'Ban a user in Clerk (sets isActive=false locally)' })
  @ApiNoContentResponse()
  @ApiParam({ name: 'clerkUserId', description: 'Clerk user ID (user_xxx)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Put('clerk/:clerkUserId/ban')
  public async ban(@Param('clerkUserId') clerkUserId: string): Promise<void> {
    const command         = new BanUserCommand();
    command.clerkUserId   = clerkUserId;
    await this.mediator.execute<BanUserCommand, void>(command);
  }

  @ApiOperation({ summary: 'Unban a user in Clerk (sets isActive=true locally)' })
  @ApiNoContentResponse()
  @ApiParam({ name: 'clerkUserId', description: 'Clerk user ID (user_xxx)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Put('clerk/:clerkUserId/unban')
  public async unban(@Param('clerkUserId') clerkUserId: string): Promise<void> {
    const command         = new UnbanUserCommand();
    command.clerkUserId   = clerkUserId;
    await this.mediator.execute<UnbanUserCommand, void>(command);
  }

  @ApiOperation({ summary: 'Delete a user from Clerk and local DB (SuperAdmin only)' })
  @ApiNoContentResponse()
  @ApiParam({ name: 'clerkUserId', description: 'Clerk user ID (user_xxx)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Delete('clerk/:clerkUserId')
  public async deleteClerkUser(@Param('clerkUserId') clerkUserId: string): Promise<void> {
    const command         = new DeleteUserCommand();
    command.clerkUserId   = clerkUserId;
    await this.mediator.execute<DeleteUserCommand, void>(command);
  }

  @ApiOperation({ summary: 'Assign a user to a Clerk organization' })
  @ApiNoContentResponse()
  @ApiParam({ name: 'clerkUserId', description: 'Clerk user ID (user_xxx)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Post('clerk/:clerkUserId/organizations')
  public async assignToOrg(
    @Param('clerkUserId') clerkUserId: string,
    @Body() body: AssignUserToOrgRequest,
  ): Promise<void> {
    const command           = this.mapper.map(body, AssignUserToOrgRequest, AssignUserToOrgCommand);
    command.clerkUserId     = clerkUserId;
    await this.mediator.execute<AssignUserToOrgCommand, void>(command);
  }

  @ApiOperation({ summary: 'Remove a user from a Clerk organization' })
  @ApiNoContentResponse()
  @ApiParam({ name: 'clerkUserId', description: 'Clerk user ID (user_xxx)' })
  @ApiParam({ name: 'organizationId', description: 'Clerk organization ID (org_xxx)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete('clerk/:clerkUserId/organizations/:organizationId')
  public async removeFromOrg(
    @Param('clerkUserId') clerkUserId: string,
    @Param('organizationId') organizationId: string,
  ): Promise<void> {
    const command             = new RemoveUserFromOrgCommand();
    command.clerkUserId       = clerkUserId;
    command.organizationId    = organizationId;
    await this.mediator.execute<RemoveUserFromOrgCommand, void>(command);
  }
}
