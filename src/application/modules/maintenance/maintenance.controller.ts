import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, requireOrganizationId } from '../../../common';
import { CreateMaintenanceRequest, MaintenanceResponse, MaintenanceTypeResponse, ListMaintenanceTypesRequest } from './models';
import { CreateMaintenanceCommand } from './commands';
import { ListMaintenanceTypesQuery } from './queries';
import { Maintenance, MaintenanceType } from './domain';

@ApiBearerAuth()
@ApiTags('Maintenance')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'maintenance', version: '1' })
export class MaintenanceController {
  public constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(MaintenanceController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Create a new maintenance record' })
  @ApiCreatedResponse({ type: MaintenanceResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(
    @Body() body: CreateMaintenanceRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<MaintenanceResponse> {
    const command           = this.mapper.map(body, CreateMaintenanceRequest, CreateMaintenanceCommand);
    command.organizationId  = requireOrganizationId(user);
    command.createdBy       = user?.dbUserId;
    const result            = await this.mediator.execute<CreateMaintenanceCommand, Maintenance>(command);
    return this.mapper.map(result, Maintenance, MaintenanceResponse);
  }

  @ApiOperation({ summary: 'List all maintenance types' })
  @ApiOkResponse({ type: [MaintenanceTypeResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('maintenance-types/list')
  public async listMaintenanceTypes(@Query() filter?: ListMaintenanceTypesRequest): Promise<MaintenanceTypeResponse[]> {
    const query  = this.mapper.map(filter, ListMaintenanceTypesRequest, ListMaintenanceTypesQuery);
    const result = await this.mediator.execute<ListMaintenanceTypesQuery, MaintenanceType[]>(query);
    return this.mapper.mapArray(result, MaintenanceType, MaintenanceTypeResponse);
  }
}
