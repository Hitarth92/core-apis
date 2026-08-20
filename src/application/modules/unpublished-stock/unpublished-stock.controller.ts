import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, CqrsMediator, CurrentUser, AuthenticatedUser, Roles, RolesGuard, InventoryNotOwnedByOrgException, assertLocationAccess } from 'src/common';
import { ERole } from 'src/infrastructure/persistence/entities/role.entity';
import { AddUnpublishedStockCommand, PublishUnpublishedStockCommand } from './commands';
import { UnpublishedStock, UnpublishedStockMovement } from './domain';
import {
  AddUnpublishedStockRequest,
  PublishUnpublishedStockRequest,
  UnpublishedStockResponse,
  UnpublishedStockMovementResponse,
  ListUnpublishedStockRequest,
} from './models';
import { GetUnpublishedStockQuery, ListMovementsByUnpublishedStockQuery, ListUnpublishedStockQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Unpublished Stock')
@Controller({ path: 'unpublished-stock', version: '1' })
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager, ERole.StoreStaff)
export class UnpublishedStockController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(UnpublishedStockController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'List all unpublished stock records for the current organization' })
  @ApiOkResponse({ type: [UnpublishedStockResponse] })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async list(@CurrentUser() user: AuthenticatedUser, @Query() filter: ListUnpublishedStockRequest): Promise<UnpublishedStockResponse[]> {
    const query          = this.mapper.map(filter, ListUnpublishedStockRequest, ListUnpublishedStockQuery);
    query.organizationId = user.organizationId;
    const result         = await this.mediator.execute<ListUnpublishedStockQuery, UnpublishedStock[]>(query);
    return this.mapper.mapArray(result, UnpublishedStock, UnpublishedStockResponse);
  }

  @ApiOperation({ summary: 'Get unpublished stock record by ID' })
  @ApiOkResponse({ type: UnpublishedStockResponse })
  @ApiParam({ name: 'id', description: 'UnpublishedStock UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<UnpublishedStockResponse> {
    const query  = new GetUnpublishedStockQuery();
    query.id     = id;
    const result = await this.mediator.execute<GetUnpublishedStockQuery, UnpublishedStock>(query);
    if (result.organizationId !== user.organizationId) throw new InventoryNotOwnedByOrgException();
    return this.mapper.map(result, UnpublishedStock, UnpublishedStockResponse);
  }

  @ApiOperation({ summary: 'List movements for an unpublished stock record' })
  @ApiOkResponse({ type: [UnpublishedStockMovementResponse] })
  @ApiParam({ name: 'unpublishedStockId', description: 'UnpublishedStock UUID' })
  @HttpCode(HttpStatus.OK)
  @Get('by-record/:unpublishedStockId')
  public async listMovements(@Param('unpublishedStockId') unpublishedStockId: string, @CurrentUser() user: AuthenticatedUser): Promise<UnpublishedStockMovementResponse[]> {
    const stockQuery = new GetUnpublishedStockQuery();
    stockQuery.id    = unpublishedStockId;
    const stock      = await this.mediator.execute<GetUnpublishedStockQuery, UnpublishedStock>(stockQuery);
    if (stock.organizationId !== user.organizationId) throw new InventoryNotOwnedByOrgException();
    const query                = new ListMovementsByUnpublishedStockQuery();
    query.unpublishedStockId   = unpublishedStockId;
    const result               = await this.mediator.execute<ListMovementsByUnpublishedStockQuery, UnpublishedStockMovement[]>(query);
    return this.mapper.mapArray(result, UnpublishedStockMovement, UnpublishedStockMovementResponse);
  }

  @ApiOperation({ summary: 'Add stock to the unpublished pool' })
  @ApiCreatedResponse()
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager)
  @Post('add')
  public async addStock(@CurrentUser() user: AuthenticatedUser, @Body() body: AddUnpublishedStockRequest): Promise<void> {
    assertLocationAccess(user, body.locationId);
    const command          = this.mapper.map(body, AddUnpublishedStockRequest, AddUnpublishedStockCommand);
    command.organizationId = user.organizationId;
    command.performedById  = user.dbUserId;
    await this.mediator.execute<AddUnpublishedStockCommand, void>(command);
  }

  @ApiOperation({ summary: 'Publish stock from unpublished pool to live inventory' })
  @ApiCreatedResponse()
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager)
  @Post('publish')
  public async publishStock(@CurrentUser() user: AuthenticatedUser, @Body() body: PublishUnpublishedStockRequest): Promise<void> {
    const existingQuery = new GetUnpublishedStockQuery();
    existingQuery.id = body.unpublishedStockId;
    const existing = await this.mediator.execute<GetUnpublishedStockQuery, UnpublishedStock>(existingQuery);
    assertLocationAccess(user, existing.locationId);
    const command          = this.mapper.map(body, PublishUnpublishedStockRequest, PublishUnpublishedStockCommand);
    command.organizationId = user.organizationId;
    command.performedById  = user.dbUserId;
    await this.mediator.execute<PublishUnpublishedStockCommand, void>(command);
  }
}
