import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, RolesGuard, Roles, requireOrganizationId, assertOrgOwnership } from '../../../common';
import { CreateDriverRequest, UpdateDriverRequest, SearchDriversRequest, ListDriversRequest, DriverResponse, DriversPagedResponse } from './models';
import { Driver } from './domain';
import { GetDriverQuery, SearchDriversQuery, ListDriversQuery } from './queries';
import { CreateDriverCommand, UpdateDriverCommand, DeleteDriverCommand } from './commands';
import { ERole } from '../../../infrastructure';

@ApiBearerAuth()
@ApiTags('Drivers')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'drivers', version: '1' })
export class DriversController {
  public constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(DriversController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Search drivers (paginated)' })
  @ApiOkResponse({ type: DriversPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async search(@Query() filter?: SearchDriversRequest): Promise<DriversPagedResponse> {
    const query  = this.mapper.map(filter, SearchDriversRequest, SearchDriversQuery);
    const result = await this.mediator.execute<SearchDriversQuery, IPageable<Driver>>(query);
    return { ...result, items: this.mapper.mapArray(result.items, Driver, DriverResponse) };
  }

  @ApiOperation({ summary: 'List all drivers' })
  @ApiOkResponse({ type: [DriverResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(@Query() filter?: ListDriversRequest): Promise<DriverResponse[]> {
    const query  = this.mapper.map(filter, ListDriversRequest, ListDriversQuery);
    const result = await this.mediator.execute<ListDriversQuery, Driver[]>(query);
    return this.mapper.mapArray(result, Driver, DriverResponse);
  }

  @ApiOperation({ summary: 'Get driver by ID' })
  @ApiOkResponse({ type: DriverResponse })
  @ApiParam({ name: 'id', description: 'Driver UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<DriverResponse> {
    const query  = new GetDriverQuery();
    query.id     = id;
    const result = await this.mediator.execute<GetDriverQuery, Driver>(query);
    assertOrgOwnership(user, result.organizationId, 'Driver');
    return this.mapper.map(result, Driver, DriverResponse);
  }

  @ApiOperation({ summary: 'Create a new driver' })
  @ApiCreatedResponse({ type: DriverResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(
    @Body() body: CreateDriverRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<DriverResponse> {
    const command             = this.mapper.map(body, CreateDriverRequest, CreateDriverCommand);
    command.organizationId    = requireOrganizationId(user);
    const result              = await this.mediator.execute<CreateDriverCommand, Driver>(command);
    return this.mapper.map(result, Driver, DriverResponse);
  }

  @ApiOperation({ summary: 'Update a driver' })
  @ApiOkResponse({ type: DriverResponse })
  @ApiParam({ name: 'id', description: 'Driver UUID' })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateDriverRequest, @CurrentUser() user: AuthenticatedUser): Promise<DriverResponse> {
    const fetchQuery = new GetDriverQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetDriverQuery, Driver>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Driver');
    const command = this.mapper.map(body, UpdateDriverRequest, UpdateDriverCommand);
    command.id    = id;
    const result  = await this.mediator.execute<UpdateDriverCommand, Driver>(command);
    return this.mapper.map(result, Driver, DriverResponse);
  }

  @ApiOperation({ summary: 'Delete a driver' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Driver UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
    const command = new DeleteDriverCommand();
    command.id    = id;
    return this.mediator.execute<DeleteDriverCommand, boolean>(command);
  }
}
