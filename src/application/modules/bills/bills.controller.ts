import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, RolesGuard, assertOrgOwnership } from '../../../common';
import {
  AddBillItemCommand,
  CreateBillCommand,
  DeleteBillCommand,
  RemoveBillItemCommand,
  TransitionBillStatusCommand,
  UpdateBillCommand,
  UpdateBillItemCommand,
} from './commands';
import { Bill } from './domain';
import {
  BillResponse,
  BillsPagedResponse,
  CreateBillItemRequest,
  CreateBillRequest,
  ListBillsRequest,
  SearchBillsRequest,
  TransitionBillStatusRequest,
  UpdateBillItemRequest,
  UpdateBillRequest,
} from './models';
import { GetBillQuery, ListBillsQuery, SearchBillsQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Bills')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Controller({ path: 'bills', version: '1' })
export class BillsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(BillsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Search bills (paginated)' })
  @ApiOkResponse({ type: BillsPagedResponse })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: SearchBillsRequest,
  ): Promise<BillsPagedResponse> {
    const query = this.mapper.map(filter ?? new SearchBillsRequest(), SearchBillsRequest, SearchBillsQuery);
    query.organizationId = user.organizationId;
    const result = await this.mediator.execute<SearchBillsQuery, IPageable<Bill>>(query);
    return { ...result, items: this.mapper.mapArray(result.items, Bill, BillResponse) };
  }

  @ApiOperation({ summary: 'List bills (flat)' })
  @ApiOkResponse({ type: [BillResponse] })
  @HttpCode(HttpStatus.OK)
  @Get('list')
  public async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter?: ListBillsRequest,
  ): Promise<BillResponse[]> {
    const query = this.mapper.map(filter ?? new ListBillsRequest(), ListBillsRequest, ListBillsQuery);
    query.organizationId = user.organizationId;
    const result = await this.mediator.execute<ListBillsQuery, Bill[]>(query);
    return this.mapper.mapArray(result, Bill, BillResponse);
  }

  @ApiOperation({ summary: 'Get bill by ID (includes items)' })
  @ApiOkResponse({ type: BillResponse })
  @ApiParam({ name: 'id', description: 'Bill UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<BillResponse> {
    const query = new GetBillQuery();
    query.id    = id;
    const result = await this.mediator.execute<GetBillQuery, Bill>(query);
    assertOrgOwnership(user, result.organizationId, 'Bill');
    return this.mapper.map(result, Bill, BillResponse);
  }

  @ApiOperation({ summary: 'Create a new bill with its items' })
  @ApiCreatedResponse({ type: BillResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateBillRequest,
  ): Promise<BillResponse> {
    const command = this.mapper.map(body, CreateBillRequest, CreateBillCommand);
    command.organizationId   = user.organizationId;
    command.createdById      = user.dbUserId;
    command.performedByRoles = user?.roles ?? [];
    command.commissionPct    = body.commissionPct;
    const result = await this.mediator.execute<CreateBillCommand, Bill>(command);
    return this.mapper.map(result, Bill, BillResponse);
  }

  @ApiOperation({ summary: 'Update a bill header' })
  @ApiOkResponse({ type: BillResponse })
  @ApiParam({ name: 'id', description: 'Bill UUID' })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateBillRequest, @CurrentUser() user: AuthenticatedUser): Promise<BillResponse> {
    const fetchQuery = new GetBillQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetBillQuery, Bill>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Bill');
    const command = this.mapper.map(body, UpdateBillRequest, UpdateBillCommand);
    command.id    = id;
    const result  = await this.mediator.execute<UpdateBillCommand, Bill>(command);
    return this.mapper.map(result, Bill, BillResponse);
  }

  @ApiOperation({ summary: 'Delete a bill (its items cascade)' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Bill UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<boolean> {
    const fetchQuery = new GetBillQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetBillQuery, Bill>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Bill');
    const command = new DeleteBillCommand();
    command.id    = id;
    return this.mediator.execute<DeleteBillCommand, boolean>(command);
  }

  @ApiOperation({ summary: 'Move a bill to another status' })
  @ApiOkResponse({ type: BillResponse })
  @ApiParam({ name: 'id', description: 'Bill UUID' })
  @HttpCode(HttpStatus.OK)
  @Patch(':id/status')
  public async transitionStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: TransitionBillStatusRequest,
  ): Promise<BillResponse> {
    const fetchQuery = new GetBillQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetBillQuery, Bill>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Bill');
    const command          = new TransitionBillStatusCommand();
    command.id             = id;
    command.status         = body.status;
    command.paymentMethod  = body.paymentMethod;
    command.performedById  = user.dbUserId;
    const result = await this.mediator.execute<TransitionBillStatusCommand, Bill>(command);
    return this.mapper.map(result, Bill, BillResponse);
  }

  @ApiOperation({ summary: 'Add an item to a bill' })
  @ApiCreatedResponse({ type: BillResponse })
  @ApiParam({ name: 'id', description: 'Bill UUID' })
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/items')
  public async addItem(@Param('id') id: string, @Body() body: CreateBillItemRequest, @CurrentUser() user: AuthenticatedUser): Promise<BillResponse> {
    const fetchQuery = new GetBillQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetBillQuery, Bill>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Bill');
    const command          = new AddBillItemCommand();
    command.billId         = id;
    command.productId      = body.productId;
    command.variantId      = body.variantId;
    command.quantity       = body.quantity;
    command.unitPrice      = body.unitPrice;
    command.taxRate        = body.taxRate;
    command.discountAmount = body.discountAmount;
    const result = await this.mediator.execute<AddBillItemCommand, Bill>(command);
    return this.mapper.map(result, Bill, BillResponse);
  }

  @ApiOperation({ summary: 'Update a single item on a bill' })
  @ApiOkResponse({ type: BillResponse })
  @ApiParam({ name: 'id', description: 'Bill UUID' })
  @ApiParam({ name: 'itemId', description: 'Bill item UUID' })
  @HttpCode(HttpStatus.OK)
  @Put(':id/items/:itemId')
  public async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateBillItemRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BillResponse> {
    const fetchQuery = new GetBillQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetBillQuery, Bill>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Bill');
    const command          = new UpdateBillItemCommand();
    command.billId         = id;
    command.itemId         = itemId;
    command.productId      = body.productId;
    command.variantId      = body.variantId;
    command.quantity       = body.quantity;
    command.unitPrice      = body.unitPrice;
    command.taxRate        = body.taxRate;
    command.discountAmount = body.discountAmount;
    const result = await this.mediator.execute<UpdateBillItemCommand, Bill>(command);
    return this.mapper.map(result, Bill, BillResponse);
  }

  @ApiOperation({ summary: 'Remove an item from a bill' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Bill UUID' })
  @ApiParam({ name: 'itemId', description: 'Bill item UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id/items/:itemId')
  public async removeItem(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser() user: AuthenticatedUser): Promise<boolean> {
    const fetchQuery = new GetBillQuery();
    fetchQuery.id = id;
    const existing = await this.mediator.execute<GetBillQuery, Bill>(fetchQuery);
    assertOrgOwnership(user, existing.organizationId, 'Bill');
    const command  = new RemoveBillItemCommand();
    command.billId = id;
    command.itemId = itemId;
    return this.mediator.execute<RemoveBillItemCommand, boolean>(command);
  }
}
