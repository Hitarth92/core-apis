import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, Roles, RolesGuard, assertOrgOwnership } from 'src/common';
import { ERole } from 'src/infrastructure/persistence/entities/role.entity';
import { EProductLogAction } from 'src/infrastructure/persistence/entities';
import { ProductLog } from './domain';
import { ProductLogResponse, ProductLogsPagedResponse } from './models';
import { GetProductLogQuery, ListLogsByInventoryQuery, ListLogsByProductQuery } from './queries';

@ApiBearerAuth()
@ApiTags('Product Logs')
@Controller({ path: 'product-logs', version: '1' })
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(ERole.OrgAdmin, ERole.SuperAdmin, ERole.StoreManager, ERole.StoreStaff)
export class ProductLogsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(ProductLogsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Get product log entry by ID' })
  @ApiOkResponse({ type: ProductLogResponse })
  @ApiParam({ name: 'id', description: 'ProductLog UUID' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<ProductLogResponse> {
    const query  = new GetProductLogQuery();
    query.id     = id;
    const result = await this.mediator.execute<GetProductLogQuery, ProductLog>(query);
    assertOrgOwnership(user, result.organizationId, 'ProductLog');
    return this.mapper.map(result, ProductLog, ProductLogResponse);
  }

  @ApiOperation({ summary: 'List logs for a product (paginated)' })
  @ApiOkResponse({ type: ProductLogsPagedResponse })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, enum: EProductLogAction })
  @HttpCode(HttpStatus.OK)
  @Get('by-product/:productId')
  public async listByProduct(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('action') action?: EProductLogAction,
  ): Promise<ProductLogsPagedResponse> {
    const query            = new ListLogsByProductQuery();
    query.productId        = productId;
    query.$page            = page ? Number(page) : 1;
    query.$perPage         = perPage ? Number(perPage) : 20;
    query.action           = action;
    const result = await this.mediator.execute<ListLogsByProductQuery, IPageable<ProductLog>>(query);
    return { ...result, items: this.mapper.mapArray(result.items, ProductLog, ProductLogResponse) };
  }

  @ApiOperation({ summary: 'List logs for an inventory record' })
  @ApiOkResponse({ type: [ProductLogResponse] })
  @ApiParam({ name: 'inventoryId', description: 'Inventory UUID' })
  @HttpCode(HttpStatus.OK)
  @Get('by-inventory/:inventoryId')
  public async listByInventory(@Param('inventoryId') inventoryId: string): Promise<ProductLogResponse[]> {
    const query        = new ListLogsByInventoryQuery();
    query.inventoryId  = inventoryId;
    const result = await this.mediator.execute<ListLogsByInventoryQuery, ProductLog[]>(query);
    return this.mapper.mapArray(result, ProductLog, ProductLogResponse);
  }
}
