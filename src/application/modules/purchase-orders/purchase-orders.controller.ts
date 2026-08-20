import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, InventoryNotOwnedByOrgException, LocationAccessDeniedException, Roles, RolesGuard, assertLocationAccess } from '../../../common';
import { ERole } from '../../../infrastructure';
import {
  CreatePurchaseOrderCommand,
  DeletePurchaseOrderCommand,
  ReceivePurchaseOrderCommand,
  UpdatePurchaseOrderCommand,
} from './commands';
import { PurchaseOrder } from './domain';
import {
  CreatePurchaseOrderRequest,
  ListPurchaseOrdersRequest,
  PurchaseOrderResponse,
  PurchaseOrdersPagedResponse,
  ReceivePurchaseOrderRequest,
  SearchPurchaseOrdersRequest,
  UpdatePurchaseOrderRequest,
} from './models';
import { GetPurchaseOrderQuery, ListPurchaseOrdersQuery, SearchPurchaseOrdersQuery } from './queries';

@ApiBearerAuth()
@ApiTags('PurchaseOrders')
@Controller({ path: 'purchase-orders', version: '1' })
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(ERole.OrgAdmin, ERole.SuperAdmin)
export class PurchaseOrdersController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(PurchaseOrdersController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Search purchase orders (paginated)' })
  @ApiOkResponse({ type: PurchaseOrdersPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: SearchPurchaseOrdersRequest,
  ): Promise<PurchaseOrdersPagedResponse> {
    if (!user.organizationId) return { items: [], page: 1, perPage: 15, totalCount: 0, totalPages: 0 };
    if (!filter?.locationId && !user.hasOrgWideAccess) throw new LocationAccessDeniedException(undefined, 'Filter by locationId, or use an org-wide role to search without one.');
    if (filter?.locationId) assertLocationAccess(user, filter.locationId);
    const query          = this.mapper.map(filter, SearchPurchaseOrdersRequest, SearchPurchaseOrdersQuery);
    query.organizationId = user.organizationId;
    const result         = await this.mediator.execute<SearchPurchaseOrdersQuery, IPageable<PurchaseOrder>>(query);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, PurchaseOrder, PurchaseOrderResponse),
    };
  }

  @ApiOperation({ summary: 'List all purchase orders' })
  @ApiOkResponse({ type: [PurchaseOrderResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: ListPurchaseOrdersRequest,
  ): Promise<PurchaseOrderResponse[]> {
    if (!user.organizationId) return [];
    if (!filter?.locationId && !user.hasOrgWideAccess) throw new LocationAccessDeniedException(undefined, 'Filter by locationId, or use an org-wide role to list without one.');
    if (filter?.locationId) assertLocationAccess(user, filter.locationId);
    const query          = this.mapper.map(filter, ListPurchaseOrdersRequest, ListPurchaseOrdersQuery);
    query.organizationId = user.organizationId;
    const result         = await this.mediator.execute<ListPurchaseOrdersQuery, PurchaseOrder[]>(query);
    return this.mapper.mapArray(result, PurchaseOrder, PurchaseOrderResponse);
  }

  @ApiOperation({ summary: 'Get purchase order by ID' })
  @ApiOkResponse({ type: PurchaseOrderResponse })
  @ApiParam({ name: 'id', description: 'Purchase Order UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<PurchaseOrderResponse> {
    const query = new GetPurchaseOrderQuery();
    query.id    = id;
    const result = await this.mediator.execute<GetPurchaseOrderQuery, PurchaseOrder>(query);
    if (result.organizationId !== user.organizationId) throw new InventoryNotOwnedByOrgException();
    assertLocationAccess(user, result.locationId);
    return this.mapper.map(result, PurchaseOrder, PurchaseOrderResponse);
  }

  @ApiOperation({ summary: 'Create a new purchase order with line items' })
  @ApiCreatedResponse({ type: PurchaseOrderResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePurchaseOrderRequest,
  ): Promise<PurchaseOrderResponse> {
    assertLocationAccess(user, body.locationId);
    const command          = this.mapper.map(body, CreatePurchaseOrderRequest, CreatePurchaseOrderCommand);
    command.organizationId = user.organizationId;
    command.createdById    = user.dbUserId;
    command.items          = body.items;
    const result           = await this.mediator.execute<CreatePurchaseOrderCommand, PurchaseOrder>(command);
    return this.mapper.map(result, PurchaseOrder, PurchaseOrderResponse);
  }

  @ApiOperation({ summary: 'Update purchase order status / notes / expected date' })
  @ApiOkResponse({ type: PurchaseOrderResponse })
  @ApiParam({ name: 'id', description: 'Purchase Order UUID' })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  public async update(
    @Param('id') id: string,
    @Body() body: UpdatePurchaseOrderRequest,
  ): Promise<PurchaseOrderResponse> {
    const command  = this.mapper.map(body, UpdatePurchaseOrderRequest, UpdatePurchaseOrderCommand);
    command.id     = id;
    const result   = await this.mediator.execute<UpdatePurchaseOrderCommand, PurchaseOrder>(command);
    return this.mapper.map(result, PurchaseOrder, PurchaseOrderResponse);
  }

  @ApiOperation({ summary: 'Receive goods for a purchase order — adds stock to the specified location' })
  @ApiOkResponse({ type: PurchaseOrderResponse })
  @ApiParam({ name: 'id', description: 'Purchase Order UUID' })
  @HttpCode(HttpStatus.OK)
  @Post(':id/receive')
  public async receive(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ReceivePurchaseOrderRequest,
  ): Promise<PurchaseOrderResponse> {
    const command            = new ReceivePurchaseOrderCommand();
    command.purchaseOrderId  = id;
    command.organizationId   = user.organizationId;
    command.locationId       = body.locationId;
    command.items            = body.items;
    command.performedById    = user.dbUserId;
    command.notes            = body.notes;
    const result             = await this.mediator.execute<ReceivePurchaseOrderCommand, PurchaseOrder>(command);
    return this.mapper.map(result, PurchaseOrder, PurchaseOrderResponse);
  }

  @ApiOperation({ summary: 'Delete a purchase order' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Purchase Order UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
    const command = new DeletePurchaseOrderCommand();
    command.id    = id;
    return this.mediator.execute<DeletePurchaseOrderCommand, boolean>(command);
  }
}
