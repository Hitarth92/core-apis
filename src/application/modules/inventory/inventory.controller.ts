import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, CqrsMediator, CurrentUser, AuthenticatedUser, IPageable, Roles, RolesGuard, InventoryNotOwnedByOrgException, LocationAccessDeniedException, assertLocationAccess } from 'src/common';
import { ERole } from 'src/infrastructure/persistence/entities/role.entity';
import { CreateInventoryCommand, DeleteInventoryCommand, UpdateInventoryCommand } from './commands';
import { Inventory } from './domain';
import { CreateInventoryRequest, ListInventoryRequest, SearchInventoryRequest, InventoryResponse, InventorysPagedResponse, UpdateInventoryRequest } from './models';
import { GetInventoryQuery, GetLowStockQuery, GetValuationQuery, ListInventoryQuery, SearchInventoryQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Inventory')
@Controller({ path: 'inventory', version: '1' })
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager, ERole.StoreStaff)
export class InventoryController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(InventoryController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Search inventory (paginated)' })
  @ApiOkResponse({ type: InventorysPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async search(@CurrentUser() user: AuthenticatedUser, @Query() filter?: SearchInventoryRequest): Promise<InventorysPagedResponse> {
    if (!filter?.locationId && !user.hasOrgWideAccess) throw new LocationAccessDeniedException(undefined, 'Filter by locationId, or use an org-wide role to search without one.');
    if (filter?.locationId) assertLocationAccess(user, filter.locationId);
    const query            = this.mapper.map(filter, SearchInventoryRequest, SearchInventoryQuery);
    query.organizationId   = user.organizationId;
    const result = await this.mediator.execute<SearchInventoryQuery, IPageable<Inventory>>(query);
    return { ...result, items: this.mapper.mapArray(result.items, Inventory, InventoryResponse) };
  }

  @ApiOperation({ summary: 'List all inventory' })
  @ApiOkResponse({ type: [InventoryResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(@CurrentUser() user: AuthenticatedUser, @Query() filter?: ListInventoryRequest): Promise<InventoryResponse[]> {
    if (!filter?.locationId && !user.hasOrgWideAccess) throw new LocationAccessDeniedException(undefined, 'Filter by locationId, or use an org-wide role to list without one.');
    if (filter?.locationId) assertLocationAccess(user, filter.locationId);
    const query            = this.mapper.map(filter, ListInventoryRequest, ListInventoryQuery);
    query.organizationId   = user.organizationId;
    const result = await this.mediator.execute<ListInventoryQuery, Inventory[]>(query);
    return this.mapper.mapArray(result, Inventory, InventoryResponse);
  }

  @ApiOperation({ summary: 'Get low-stock items for the organization' })
  @ApiOkResponse({ type: [InventoryResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('low-stock')
  public async getLowStock(@CurrentUser() user: AuthenticatedUser): Promise<InventoryResponse[]> {
    const query            = new GetLowStockQuery();
    query.organizationId   = user.organizationId;
    const result = await this.mediator.execute<GetLowStockQuery, Inventory[]>(query);
    return this.mapper.mapArray(result, Inventory, InventoryResponse);
  }

  @ApiOperation({ summary: 'Get stock valuation for the organization' })
  @ApiOkResponse({ type: [InventoryResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('valuation')
  public async getValuation(@CurrentUser() user: AuthenticatedUser): Promise<InventoryResponse[]> {
    const query            = new GetValuationQuery();
    query.organizationId   = user.organizationId;
    const result = await this.mediator.execute<GetValuationQuery, Inventory[]>(query);
    return this.mapper.mapArray(result, Inventory, InventoryResponse);
  }

  @ApiOperation({ summary: 'Get inventory by ID' })
  @ApiOkResponse({ type: InventoryResponse })
  @ApiParam({ name: 'id', description: 'Inventory UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<InventoryResponse> {
    const query  = new GetInventoryQuery();
    query.id     = id;
    const result = await this.mediator.execute<GetInventoryQuery, Inventory>(query);
    if (result.organizationId !== user.organizationId) throw new InventoryNotOwnedByOrgException();
    assertLocationAccess(user, result.locationId);
    return this.mapper.map(result, Inventory, InventoryResponse);
  }

  @ApiOperation({ summary: 'Create an inventory record for a product at a location' })
  @ApiCreatedResponse({ type: InventoryResponse })
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager)
  @Post()
  public async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateInventoryRequest,
  ): Promise<InventoryResponse> {
    assertLocationAccess(user, body.locationId);
    const command          = this.mapper.map(body, CreateInventoryRequest, CreateInventoryCommand);
    command.organizationId = user.organizationId;
    const result           = await this.mediator.execute<CreateInventoryCommand, Inventory>(command);
    return this.mapper.map(result, Inventory, InventoryResponse);
  }

  @ApiOperation({ summary: 'Update inventory settings (reorder level, max stock, bin)' })
  @ApiOkResponse({ type: InventoryResponse })
  @ApiParam({ name: 'id', description: 'Inventory UUID' })
  @HttpCode(HttpStatus.OK)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateInventoryRequest, @CurrentUser() user: AuthenticatedUser): Promise<InventoryResponse> {
    const existing = await this.mediator.execute<GetInventoryQuery, Inventory>(Object.assign(new GetInventoryQuery(), { id }));
    if (existing.organizationId !== user.organizationId) throw new InventoryNotOwnedByOrgException();
    assertLocationAccess(user, existing.locationId);
    const command = this.mapper.map(body, UpdateInventoryRequest, UpdateInventoryCommand);
    command.id    = id;
    const result  = await this.mediator.execute<UpdateInventoryCommand, Inventory>(command);
    return this.mapper.map(result, Inventory, InventoryResponse);
  }

  @ApiOperation({ summary: 'Delete an inventory record' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Inventory UUID' })
  @HttpCode(HttpStatus.OK)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<boolean> {
    const existing = await this.mediator.execute<GetInventoryQuery, Inventory>(Object.assign(new GetInventoryQuery(), { id }));
    if (existing.organizationId !== user.organizationId) throw new InventoryNotOwnedByOrgException();
    assertLocationAccess(user, existing.locationId);
    const command = new DeleteInventoryCommand();
    command.id    = id;
    return this.mediator.execute<DeleteInventoryCommand, boolean>(command);
  }
}
