import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles } from '../../../common';
import { IPageable } from '../../../common';
import { ERole } from '../../../infrastructure';
import { CreateOrganizationCommand, DeleteOrganizationCommand, UpdateOrganizationCommand } from './commands';
import { Organization } from './domain';
import { CreateOrganizationRequest, SearchOrganizationsRequest, ListOrganizationsRequest, OrganizationResponse, OrganizationsPagedResponse, UpdateOrganizationRequest } from './models';
import { GetOrganizationQuery, ListOrganizationsQuery, SearchOrganizationsQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Organizations')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(OrganizationsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Search organizations (paginated)' })
  @ApiOkResponse({ type: OrganizationsPagedResponse })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Get()
  public async search(@Query() filter?: SearchOrganizationsRequest): Promise<OrganizationsPagedResponse> {
    const query = this.mapper.map(filter, SearchOrganizationsRequest, SearchOrganizationsQuery);
    const result = await this.mediator.execute<SearchOrganizationsQuery, IPageable<Organization>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, Organization, OrganizationResponse),
    };
  }

  @ApiOperation({ summary: 'List all organizations' })
  @ApiOkResponse({ type: [OrganizationResponse] })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Get('list')
  public async list(@Query() filter?: ListOrganizationsRequest): Promise<OrganizationResponse[]> {
    const query = this.mapper.map(filter, ListOrganizationsRequest, ListOrganizationsQuery);
    const result = await this.mediator.execute<ListOrganizationsQuery, Organization[]>(query);
    return this.mapper.mapArray(result, Organization, OrganizationResponse);
  }

  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiOkResponse({ type: OrganizationResponse })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Get(':id')
  public async getById(@Param('id') id: string): Promise<OrganizationResponse> {
    const query = new GetOrganizationQuery();
    query.id = id;
    const result = await this.mediator.execute<GetOrganizationQuery, Organization>(query);
    return this.mapper.map(result, Organization, OrganizationResponse);
  }

  @ApiOperation({ summary: 'Create a new organization' })
  @ApiCreatedResponse({ type: OrganizationResponse })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Post()
  public async create(@Body() body: CreateOrganizationRequest): Promise<OrganizationResponse> {
    const command = this.mapper.map(body, CreateOrganizationRequest, CreateOrganizationCommand);
    const result  = await this.mediator.execute<CreateOrganizationCommand, Organization>(command);
    return this.mapper.map(result, Organization, OrganizationResponse);
  }

  @ApiOperation({ summary: 'Update a organization' })
  @ApiOkResponse({ type: OrganizationResponse })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateOrganizationRequest): Promise<OrganizationResponse> {
    const command = this.mapper.map(body, UpdateOrganizationRequest, UpdateOrganizationCommand);
    command.id    = id;
    const result  = await this.mediator.execute<UpdateOrganizationCommand, Organization>(command);
    return this.mapper.map(result, Organization, OrganizationResponse);
  }

  @ApiOperation({ summary: 'Delete a organization' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
    const command = new DeleteOrganizationCommand();
    command.id    = id;
    return this.mediator.execute<DeleteOrganizationCommand, boolean>(command);
  }
}
