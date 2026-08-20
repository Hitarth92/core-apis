import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, Roles, RolesGuard, assertOrgOwnership } from '../../../common';
import { ERole } from '../../../infrastructure';
import { CreateSupplierCommand, DeleteSupplierCommand, UpdateSupplierCommand } from './commands';
import { Supplier } from './domain';
import { CreateSupplierRequest, SearchSuppliersRequest, ListSuppliersRequest, SupplierResponse, SuppliersPagedResponse, UpdateSupplierRequest } from './models';
import { GetSupplierQuery, ListSuppliersQuery, SearchSuppliersQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Suppliers')
@Controller({ path: 'suppliers', version: '1' })
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(ERole.OrgAdmin, ERole.SuperAdmin)
export class SuppliersController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(SuppliersController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Search suppliers (paginated)' })
  @ApiOkResponse({ type: SuppliersPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: SearchSuppliersRequest,
  ): Promise<SuppliersPagedResponse> {
    if (!user.organizationId) return { items: [], page: 1, perPage: 15, totalCount: 0, totalPages: 0 };
    const query          = this.mapper.map(filter, SearchSuppliersRequest, SearchSuppliersQuery);
    query.organizationId = user.organizationId;
    const result         = await this.mediator.execute<SearchSuppliersQuery, IPageable<Supplier>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, Supplier, SupplierResponse),
    };
  }

  @ApiOperation({ summary: 'List all suppliers for the current organization' })
  @ApiOkResponse({ type: [SupplierResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: ListSuppliersRequest,
  ): Promise<SupplierResponse[]> {
    if (!user.organizationId) return [];
    const query          = this.mapper.map(filter, ListSuppliersRequest, ListSuppliersQuery);
    query.organizationId = user.organizationId;
    const result         = await this.mediator.execute<ListSuppliersQuery, Supplier[]>(query);
    return this.mapper.mapArray(result, Supplier, SupplierResponse);
  }

  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiOkResponse({ type: SupplierResponse })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<SupplierResponse> {
    const query = new GetSupplierQuery();
    query.id = id;
    const result = await this.mediator.execute<GetSupplierQuery, Supplier>(query);
    assertOrgOwnership(user, result.organizationId, 'Supplier');
    return this.mapper.map(result, Supplier, SupplierResponse);
  }

  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiCreatedResponse({ type: SupplierResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateSupplierRequest,
  ): Promise<SupplierResponse> {
    const command = this.mapper.map(body, CreateSupplierRequest, CreateSupplierCommand);
    command.organizationId = user.organizationId;
    const result = await this.mediator.execute<CreateSupplierCommand, Supplier>(command);
    return this.mapper.map(result, Supplier, SupplierResponse);
  }

  @ApiOperation({ summary: 'Update a supplier' })
  @ApiOkResponse({ type: SupplierResponse })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateSupplierRequest, @CurrentUser() user: AuthenticatedUser): Promise<SupplierResponse> {
    const fetchQuery = new GetSupplierQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetSupplierQuery, Supplier>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Supplier');
    const command = this.mapper.map(body, UpdateSupplierRequest, UpdateSupplierCommand);
    command.id    = id;
    const result  = await this.mediator.execute<UpdateSupplierCommand, Supplier>(command);
    return this.mapper.map(result, Supplier, SupplierResponse);
  }

  @ApiOperation({ summary: 'Delete a supplier' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<boolean> {
    const fetchQuery = new GetSupplierQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetSupplierQuery, Supplier>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Supplier');
    const command = new DeleteSupplierCommand();
    command.id    = id;
    return this.mediator.execute<DeleteSupplierCommand, boolean>(command);
  }
}
