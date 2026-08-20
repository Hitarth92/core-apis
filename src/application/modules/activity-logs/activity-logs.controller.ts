import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, assertOrgOwnership, requireOrganizationId } from '../../../common';
import { CreateActivityLogCommand } from './commands';
import { ActivityLog } from './domain';
import { CreateActivityLogRequest, ActivityLogResponse } from './models';
import { GetActivityLogQuery, ListActivityLogsQuery } from './queries';

@ApiBearerAuth()
@ApiTags('ActivityLogs')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'activity-logs', version: '1' })
export class ActivityLogsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(ActivityLogsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'List all activity logs' })
  @ApiOkResponse({ type: [ActivityLogResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(@CurrentUser() user?: AuthenticatedUser): Promise<ActivityLogResponse[]> {
    const query = new ListActivityLogsQuery();
    query.organizationId = requireOrganizationId(user);
    return this.mediator.execute<ListActivityLogsQuery, ActivityLogResponse[]>(query);
  }

  @ApiOperation({ summary: 'Get activity log by ID' })
  @ApiOkResponse({ type: ActivityLogResponse })
  @ApiParam({ name: 'id', description: 'ActivityLog UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<ActivityLogResponse> {
    const query = new GetActivityLogQuery();
    query.id = id;
    const result = await this.mediator.execute<GetActivityLogQuery, ActivityLog>(query);
    assertOrgOwnership(user, result.organizationId, 'activity-log');
    return this.mapper.map(result, ActivityLog, ActivityLogResponse);
  }

  @ApiOperation({ summary: 'Create a new activity log' })
  @ApiCreatedResponse({ type: ActivityLogResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(@Body() body: CreateActivityLogRequest): Promise<ActivityLogResponse> {
    const command = this.mapper.map(body, CreateActivityLogRequest, CreateActivityLogCommand);
    const result  = await this.mediator.execute<CreateActivityLogCommand, ActivityLog>(command);
    return this.mapper.map(result, ActivityLog, ActivityLogResponse);
  }
}
