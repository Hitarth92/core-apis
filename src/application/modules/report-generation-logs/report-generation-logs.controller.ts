import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, RolesGuard, Roles, assertOrgOwnership } from '../../../common';
import { IPageable } from '../../../common';
import { ERole } from '../../../infrastructure';
import { CreateReportLogCommand, DeleteReportLogCommand, UpdateReportLogCommand } from './commands';
import { ReportGenerationLog } from './domain';
import { CreateReportLogRequest, SearchReportLogsRequest, ListReportLogsRequest, ReportGenerationLogResponse, ReportGenerationLogsPagedResponse, UpdateReportLogRequest } from './models';
import { GetReportLogQuery, ListReportLogsQuery, SearchReportLogsQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Report Generation Logs')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'report-generation-logs', version: '1' })
export class ReportGenerationLogsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(ReportGenerationLogsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Search report logs (paginated)' })
  @ApiOkResponse({ type: ReportGenerationLogsPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async search(@Query() filter?: SearchReportLogsRequest): Promise<ReportGenerationLogsPagedResponse> {
    const query = this.mapper.map(filter, SearchReportLogsRequest, SearchReportLogsQuery);
    const result = await this.mediator.execute<SearchReportLogsQuery, IPageable<ReportGenerationLog>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, ReportGenerationLog, ReportGenerationLogResponse),
    };
  }

  @ApiOperation({ summary: 'List all report logs' })
  @ApiOkResponse({ type: [ReportGenerationLogResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(@Query() filter?: ListReportLogsRequest): Promise<ReportGenerationLogResponse[]> {
    const query = this.mapper.map(filter, ListReportLogsRequest, ListReportLogsQuery);
    const result = await this.mediator.execute<ListReportLogsQuery, ReportGenerationLog[]>(query);
    return this.mapper.mapArray(result, ReportGenerationLog, ReportGenerationLogResponse);
  }

  @ApiOperation({ summary: 'Get report log by ID' })
  @ApiOkResponse({ type: ReportGenerationLogResponse })
  @ApiParam({ name: 'id', description: 'Report Log UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<ReportGenerationLogResponse> {
    const query = new GetReportLogQuery();
    query.id = id;
    const result = await this.mediator.execute<GetReportLogQuery, ReportGenerationLog>(query);
    assertOrgOwnership(user, result.orgId, 'Report Generation Log');
    return this.mapper.map(result, ReportGenerationLog, ReportGenerationLogResponse);
  }

  @ApiOperation({ summary: 'Create a new report log' })
  @ApiCreatedResponse({ type: ReportGenerationLogResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(@Body() body: CreateReportLogRequest): Promise<ReportGenerationLogResponse> {
    const command = this.mapper.map(body, CreateReportLogRequest, CreateReportLogCommand);
    const result  = await this.mediator.execute<CreateReportLogCommand, ReportGenerationLog>(command);
    return this.mapper.map(result, ReportGenerationLog, ReportGenerationLogResponse);
  }

  @ApiOperation({ summary: 'Update a report log' })
  @ApiOkResponse({ type: ReportGenerationLogResponse })
  @ApiParam({ name: 'id', description: 'Report Log UUID' })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateReportLogRequest, @CurrentUser() user: AuthenticatedUser): Promise<ReportGenerationLogResponse> {
    const fetchQuery = new GetReportLogQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetReportLogQuery, ReportGenerationLog>(fetchQuery);
    assertOrgOwnership(user, existing.orgId, 'Report Generation Log');
    const command = this.mapper.map(body, UpdateReportLogRequest, UpdateReportLogCommand);
    command.id    = id;
    const result  = await this.mediator.execute<UpdateReportLogCommand, ReportGenerationLog>(command);
    return this.mapper.map(result, ReportGenerationLog, ReportGenerationLogResponse);
  }

  @ApiOperation({ summary: 'Delete a report log' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Report Log UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
    const command = new DeleteReportLogCommand();
    command.id    = id;
    return this.mediator.execute<DeleteReportLogCommand, boolean>(command);
  }
}
