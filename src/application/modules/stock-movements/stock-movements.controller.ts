import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, CqrsMediator, CurrentUser, AuthenticatedUser, Roles, RolesGuard, InventoryNotOwnedByOrgException, assertLocationAccess } from 'src/common';
import { ERole } from 'src/infrastructure/persistence/entities/role.entity';
import { Inventory } from 'src/application/modules/inventory/domain';
import { GetInventoryQuery } from 'src/application/modules/inventory/queries/get-inventory';
import { AddStockCommand, AdjustStockCommand, DamageStockCommand, ReleaseReservationCommand, RemoveStockCommand, ReserveStockCommand, WriteOffStockCommand } from './commands';
import { StockMovement } from './domain';
import { AdjustStockRequest, StockMovementResponse, StockOperationRequest } from './models';
import { GetStockMovementQuery, ListMovementsByInventoryQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Stock Movements')
@Controller({ path: 'stock-movements', version: '1' })
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager, ERole.StoreStaff)
export class StockMovementsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(StockMovementsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Get stock movement by ID' })
  @ApiOkResponse({ type: StockMovementResponse })
  @ApiParam({ name: 'id', description: 'StockMovement UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<StockMovementResponse> {
    const query  = new GetStockMovementQuery();
    query.id     = id;
    const result = await this.mediator.execute<GetStockMovementQuery, StockMovement>(query);
    const invQuery     = new GetInventoryQuery();
    invQuery.id        = result.inventoryId;
    const inventory    = await this.mediator.execute<GetInventoryQuery, Inventory>(invQuery);
    if (inventory.organizationId !== user.organizationId) throw new InventoryNotOwnedByOrgException();
    assertLocationAccess(user, inventory.locationId);
    return this.mapper.map(result, StockMovement, StockMovementResponse);
  }

  @ApiOperation({ summary: 'List stock movements for an inventory record' })
  @ApiOkResponse({ type: [StockMovementResponse] })
  @ApiParam({ name: 'inventoryId', description: 'Inventory UUID' })
  @HttpCode(HttpStatus.OK)
  @Get('by-inventory/:inventoryId')
  public async listByInventory(@Param('inventoryId') inventoryId: string, @CurrentUser() user: AuthenticatedUser): Promise<StockMovementResponse[]> {
    const invQuery     = new GetInventoryQuery();
    invQuery.id        = inventoryId;
    const inventory    = await this.mediator.execute<GetInventoryQuery, Inventory>(invQuery);
    if (inventory.organizationId !== user.organizationId) throw new InventoryNotOwnedByOrgException();
    assertLocationAccess(user, inventory.locationId);
    const query        = new ListMovementsByInventoryQuery();
    query.inventoryId  = inventoryId;
    const result       = await this.mediator.execute<ListMovementsByInventoryQuery, StockMovement[]>(query);
    return this.mapper.mapArray(result, StockMovement, StockMovementResponse);
  }

  @ApiOperation({ summary: 'Add published stock to an inventory record' })
  @ApiCreatedResponse()
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager)
  @Post('add')
  public async addStock(@CurrentUser() user: AuthenticatedUser, @Body() body: StockOperationRequest): Promise<void> {
    assertLocationAccess(user, body.locationId);
    const command          = this.mapper.map(body, StockOperationRequest, AddStockCommand);
    command.organizationId = user.organizationId;
    command.performedById  = user.dbUserId;
    await this.mediator.execute<AddStockCommand, void>(command);
  }

  @ApiOperation({ summary: 'Remove stock from an inventory record' })
  @ApiCreatedResponse()
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager)
  @Post('remove')
  public async removeStock(@CurrentUser() user: AuthenticatedUser, @Body() body: StockOperationRequest): Promise<void> {
    assertLocationAccess(user, body.locationId);
    const command          = this.mapper.map(body, StockOperationRequest, RemoveStockCommand);
    command.organizationId = user.organizationId;
    command.performedById  = user.dbUserId;
    await this.mediator.execute<RemoveStockCommand, void>(command);
  }

  @ApiOperation({ summary: 'Adjust stock to an absolute quantity' })
  @ApiCreatedResponse()
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager)
  @Post('adjust')
  public async adjustStock(@CurrentUser() user: AuthenticatedUser, @Body() body: AdjustStockRequest): Promise<void> {
    assertLocationAccess(user, body.locationId);
    const command          = this.mapper.map(body, AdjustStockRequest, AdjustStockCommand);
    command.organizationId = user.organizationId;
    command.performedById  = user.dbUserId;
    await this.mediator.execute<AdjustStockCommand, void>(command);
  }

  @ApiOperation({ summary: 'Reserve stock for a pending order' })
  @ApiCreatedResponse()
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager)
  @Post('reserve')
  public async reserveStock(@CurrentUser() user: AuthenticatedUser, @Body() body: StockOperationRequest): Promise<void> {
    assertLocationAccess(user, body.locationId);
    const command          = this.mapper.map(body, StockOperationRequest, ReserveStockCommand);
    command.organizationId = user.organizationId;
    command.performedById  = user.dbUserId;
    await this.mediator.execute<ReserveStockCommand, void>(command);
  }

  @ApiOperation({ summary: 'Release a stock reservation' })
  @ApiCreatedResponse()
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager)
  @Post('release-reservation')
  public async releaseReservation(@CurrentUser() user: AuthenticatedUser, @Body() body: StockOperationRequest): Promise<void> {
    assertLocationAccess(user, body.locationId);
    const command          = this.mapper.map(body, StockOperationRequest, ReleaseReservationCommand);
    command.organizationId = user.organizationId;
    command.performedById  = user.dbUserId;
    await this.mediator.execute<ReleaseReservationCommand, void>(command);
  }

  @ApiOperation({ summary: 'Mark stock as damaged' })
  @ApiCreatedResponse()
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager)
  @Post('damage')
  public async damageStock(@CurrentUser() user: AuthenticatedUser, @Body() body: StockOperationRequest): Promise<void> {
    assertLocationAccess(user, body.locationId);
    const command          = this.mapper.map(body, StockOperationRequest, DamageStockCommand);
    command.organizationId = user.organizationId;
    command.performedById  = user.dbUserId;
    await this.mediator.execute<DamageStockCommand, void>(command);
  }

  @ApiOperation({ summary: 'Write off stock (shrinkage, expiry)' })
  @ApiCreatedResponse()
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager)
  @Post('write-off')
  public async writeOffStock(@CurrentUser() user: AuthenticatedUser, @Body() body: StockOperationRequest): Promise<void> {
    assertLocationAccess(user, body.locationId);
    const command          = this.mapper.map(body, StockOperationRequest, WriteOffStockCommand);
    command.organizationId = user.organizationId;
    command.performedById  = user.dbUserId;
    await this.mediator.execute<WriteOffStockCommand, void>(command);
  }
}
