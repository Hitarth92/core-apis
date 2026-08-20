import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, CentrifugalService, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, ResourceNotOwnedByOrgException, requireDbUserId, requireOrganizationId } from '../../../common';
import { CreateNotificationCommand, DeleteNotificationCommand, MarkAllNotificationsReadCommand, UpdateNotificationCommand } from './commands';
import { Notification } from './domain';
import { CreateNotificationRequest, SearchNotificationsRequest, ListNotificationsRequest, NotificationResponse, NotificationsPagedResponse, UpdateNotificationRequest } from './models';
import { GetNotificationQuery, GetUnreadNotificationCountQuery, ListNotificationsQuery, SearchNotificationsQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Notifications')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(NotificationsController.name) protected readonly logger: PinoLogger,
    protected readonly centrifugal: CentrifugalService,
  ) {}

  @ApiOperation({ summary: 'Unread notification count for the current user' })
  @ApiOkResponse({ schema: { type: 'object', properties: { count: { type: 'number' } } } })
  @HttpCode(HttpStatus.OK)
  @Get('unread-count')
  public async getUnreadCount(@CurrentUser() user: AuthenticatedUser): Promise<{ count: number }> {
    const query = new GetUnreadNotificationCountQuery();
    query.userId = requireDbUserId(user);
    const count = await this.mediator.execute<GetUnreadNotificationCountQuery, number>(query);
    return { count };
  }

  @ApiOperation({ summary: 'Mark all notifications as read for the current user' })
  @ApiOkResponse({ schema: { type: 'object', properties: { ok: { type: 'boolean' } } } })
  @HttpCode(HttpStatus.OK)
  @Put('mark-all-read')
  public async markAllRead(@CurrentUser() user: AuthenticatedUser): Promise<{ ok: boolean }> {
    const command = new MarkAllNotificationsReadCommand();
    command.userId = requireDbUserId(user);
    await this.mediator.execute<MarkAllNotificationsReadCommand, void>(command);
    return { ok: true };
  }

  @ApiOperation({ summary: 'Search notifications (paginated)' })
  @ApiOkResponse({ type: NotificationsPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async search(
    @Query() filter?: SearchNotificationsRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<NotificationsPagedResponse> {
    const query = filter
      ? this.mapper.map(filter, SearchNotificationsRequest, SearchNotificationsQuery)
      : new SearchNotificationsQuery();
    query.userId = requireDbUserId(user);
    query.orgId = requireOrganizationId(user);
    const result = await this.mediator.execute<SearchNotificationsQuery, IPageable<Notification>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, Notification, NotificationResponse),
    };
  }

  @ApiOperation({ summary: 'List all notifications' })
  @ApiOkResponse({ type: [NotificationResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(
    @Query() filter?: ListNotificationsRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<NotificationResponse[]> {
    const query = filter
      ? this.mapper.map(filter, ListNotificationsRequest, ListNotificationsQuery)
      : new ListNotificationsQuery();
    query.userId = requireDbUserId(user);
    query.orgId = requireOrganizationId(user);
    const result = await this.mediator.execute<ListNotificationsQuery, Notification[]>(query);
    return this.mapper.mapArray(result, Notification, NotificationResponse);
  }

  @ApiOperation({ summary: 'Issue a Centrifugo connection token for the current user' })
  @ApiOkResponse({ schema: { type: 'object', properties: { token: { type: 'string' } } } })
  @HttpCode(HttpStatus.OK)
  @Get('centrifugo-token')
  public getCentrifugoToken(@CurrentUser() user: AuthenticatedUser): { token: string } {
    const userId  = user.dbUserId ?? '';
    const channels = [`user_${userId}`];
    if (user.organizationId) channels.push(`org_${user.organizationId}`);
    const token = this.centrifugal.generateClientToken(
      { id: userId, channels },
      { expiresIn: 3600 },
    );
    return { token };
  }

  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiOkResponse({ type: NotificationResponse })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<NotificationResponse> {
    const query = new GetNotificationQuery();
    query.id = id;
    const result = await this.mediator.execute<GetNotificationQuery, Notification>(query);
    if (result.userId !== requireDbUserId(user)) throw new ResourceNotOwnedByOrgException('notification');
    return this.mapper.map(result, Notification, NotificationResponse);
  }

  @ApiOperation({ summary: 'Create a new notification' })
  @ApiCreatedResponse({ type: NotificationResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(
    @Body() body: CreateNotificationRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<NotificationResponse> {
    const command = this.mapper.map(body, CreateNotificationRequest, CreateNotificationCommand);
    command.userId = requireDbUserId(user);
    command.orgId = requireOrganizationId(user);
    const result  = await this.mediator.execute<CreateNotificationCommand, Notification>(command);
    return this.mapper.map(result, Notification, NotificationResponse);
  }

  @ApiOperation({ summary: 'Update a notification (e.g. mark as read by setting readAt)' })
  @ApiOkResponse({ type: NotificationResponse })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateNotificationRequest, @CurrentUser() user?: AuthenticatedUser): Promise<NotificationResponse> {
    const existing = await this.mediator.execute<GetNotificationQuery, Notification>(Object.assign(new GetNotificationQuery(), { id }));
    if (existing.userId !== requireDbUserId(user)) throw new ResourceNotOwnedByOrgException('notification');
    const command = this.mapper.map(body, UpdateNotificationRequest, UpdateNotificationCommand);
    command.id    = id;
    const result  = await this.mediator.execute<UpdateNotificationCommand, Notification>(command);
    return this.mapper.map(result, Notification, NotificationResponse);
  }

  @ApiOperation({ summary: 'Delete a notification' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<boolean> {
    const existing = await this.mediator.execute<GetNotificationQuery, Notification>(Object.assign(new GetNotificationQuery(), { id }));
    if (existing.userId !== requireDbUserId(user)) throw new ResourceNotOwnedByOrgException('notification');
    const command = new DeleteNotificationCommand();
    command.id    = id;
    return this.mediator.execute<DeleteNotificationCommand, boolean>(command);
  }
}
