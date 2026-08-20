import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, requireOrganizationId } from '../../../common';
import { buildAnalyticsQueryContext } from './analytics-query.helper';
import { GetFleetSummaryKpisQuery } from './queries/get-fleet-summary';
import { GetFinancialKpisQuery } from './queries/get-financial-kpis';
import { GetSalesSummaryQuery } from './queries/get-sales-summary';
import { GetRevenueTrendQuery } from './queries/get-revenue-trend';
import { GetTopProductsQuery } from './queries/get-top-products';
import { GetTopCustomersQuery } from './queries/get-top-customers';
import { GetPurchaseSummaryQuery } from './queries/get-purchase-summary';
import { GetPurchaseTrendQuery } from './queries/get-purchase-trend';
import { GetTopSuppliersQuery } from './queries/get-top-suppliers';
import { GetInventorySummaryQuery } from './queries/get-inventory-summary';
import { GetStockByLocationQuery } from './queries/get-stock-by-location';
import { GetPaymentMixQuery } from './queries/get-payment-mix';
import { GetStockValueByCategoryQuery } from './queries/get-stock-value-by-category';
import { GetPurchaseByCategoryQuery } from './queries/get-purchase-by-category';
import { GetPurchaseExceptionsQuery } from './queries/get-purchase-exceptions';
import { GetProductDemandTiersQuery } from './queries/get-product-demand-tiers';
import { GetFastMovingProductsQuery } from './queries/get-fast-moving-products';
import { GetDeadStockQuery } from './queries/get-dead-stock';
import { GetTopMarginProductsQuery } from './queries/get-top-margin-products';
import { GetCostlyProductsQuery } from './queries/get-costly-products';
import { GetSupplierPriceComparisonQuery } from './queries/get-supplier-price-comparison';
import { GetInventoryStatusQuery } from './queries/get-inventory-status';
import { GetInventoryStatusTrendQuery } from './queries/get-inventory-status-trend';
import { GetStockDamageSummaryQuery } from './queries/get-stock-damage-summary';
import {
  FleetSummaryResponse,
  FinancialKpisResponse,
  SalesSummaryResponse,
  RevenueTrendPointResponse,
  TopProductResponse,
  TopCustomerResponse,
  PurchaseSummaryResponse,
  PurchaseTrendPointResponse,
  TopSupplierResponse,
  InventorySummaryResponse,
  StockByLocationPointResponse,
  PaymentMixPointResponse,
  CategoryValuePointResponse,
  PurchaseExceptionsResponse,
  DemandTierPointResponse,
  ProductMovementRankResponse,
  ProductMarginRankResponse,
  SupplierPricePointResponse,
  InventoryStatusResponse,
  InventoryStatusTrendPointResponse,
  StockDamageSummaryResponse,
} from './models';

const PERIOD_QUERY = [
  { name: 'period', required: false, description: 'today | 7d | month | year | custom' },
  { name: 'from', required: false, description: 'ISO date (custom period start)' },
  { name: 'to', required: false, description: 'ISO date (custom period end)' },
  { name: 'locationId', required: false, description: 'Filter by store/location UUID' },
];

@ApiBearerAuth()
@ApiTags('Analytics')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  public constructor(
    protected readonly mediator: CqrsMediator,
    @InjectPinoLogger(AnalyticsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Get fleet summary KPIs' })
  @ApiOkResponse({ type: FleetSummaryResponse })
  @Get('fleet-summary')
  public async getFleetSummary(@CurrentUser() user?: AuthenticatedUser): Promise<FleetSummaryResponse> {
    const query = new GetFleetSummaryKpisQuery();
    query.organizationId = requireOrganizationId(user);
    return this.mediator.execute<GetFleetSummaryKpisQuery, FleetSummaryResponse>(query);
  }

  @ApiOperation({ summary: 'Get financial KPIs' })
  @ApiOkResponse({ type: FinancialKpisResponse })
  @Get('financials')
  public async getFinancialKpis(@CurrentUser() user?: AuthenticatedUser): Promise<FinancialKpisResponse> {
    const query = new GetFinancialKpisQuery();
    query.organizationId = requireOrganizationId(user);
    return this.mediator.execute<GetFinancialKpisQuery, FinancialKpisResponse>(query);
  }

  @ApiOperation({ summary: 'Get sales summary KPIs' })
  @ApiOkResponse({ type: SalesSummaryResponse })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @Get('sales-summary')
  public async getSalesSummary(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<SalesSummaryResponse> {
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId });
    const query = new GetSalesSummaryQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    return this.mediator.execute<GetSalesSummaryQuery, SalesSummaryResponse>(query);
  }

  @ApiOperation({ summary: 'Get revenue trend for a period' })
  @ApiOkResponse({ type: [RevenueTrendPointResponse] })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @ApiQuery({ name: 'months', required: false, description: 'Legacy: last N months if period omitted' })
  @Get('revenue-trend')
  public async getRevenueTrend(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @Query('months') rawMonths?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<RevenueTrendPointResponse[]> {
    const months = rawMonths ? Math.max(1, Math.min(24, parseInt(rawMonths, 10))) : undefined;
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId, months });
    const query = new GetRevenueTrendQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    query.trunc = ctx.trunc;
    return this.mediator.execute<GetRevenueTrendQuery, RevenueTrendPointResponse[]>(query);
  }

  @ApiOperation({ summary: 'Get top products by revenue from completed bills' })
  @ApiOkResponse({ type: [TopProductResponse] })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @ApiQuery({ name: 'limit', required: false })
  @Get('top-products')
  public async getTopProducts(
    @Query('limit') rawLimit?: string,
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<TopProductResponse[]> {
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId });
    const query = new GetTopProductsQuery();
    query.organizationId = ctx.organizationId;
    query.limit = rawLimit ? Math.max(1, Math.min(50, parseInt(rawLimit, 10))) : 10;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    return this.mediator.execute<GetTopProductsQuery, TopProductResponse[]>(query);
  }

  @ApiOperation({ summary: 'Get top customers by spend on completed bills' })
  @ApiOkResponse({ type: [TopCustomerResponse] })
  @Get('top-customers')
  public async getTopCustomers(
    @Query('limit') rawLimit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<TopCustomerResponse[]> {
    const query = new GetTopCustomersQuery();
    query.organizationId = requireOrganizationId(user);
    query.limit = rawLimit ? Math.max(1, Math.min(50, parseInt(rawLimit, 10))) : 10;
    return this.mediator.execute<GetTopCustomersQuery, TopCustomerResponse[]>(query);
  }

  @ApiOperation({ summary: 'Get purchase summary KPIs' })
  @ApiOkResponse({ type: PurchaseSummaryResponse })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @Get('purchase-summary')
  public async getPurchaseSummary(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PurchaseSummaryResponse> {
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId });
    const query = new GetPurchaseSummaryQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    return this.mediator.execute<GetPurchaseSummaryQuery, PurchaseSummaryResponse>(query);
  }

  @ApiOperation({ summary: 'Get purchase trend for a period' })
  @ApiOkResponse({ type: [PurchaseTrendPointResponse] })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @ApiQuery({ name: 'months', required: false })
  @Get('purchase-trend')
  public async getPurchaseTrend(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @Query('months') rawMonths?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PurchaseTrendPointResponse[]> {
    const months = rawMonths ? Math.max(1, Math.min(24, parseInt(rawMonths, 10))) : undefined;
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId, months });
    const query = new GetPurchaseTrendQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    query.trunc = ctx.trunc;
    return this.mediator.execute<GetPurchaseTrendQuery, PurchaseTrendPointResponse[]>(query);
  }

  @ApiOperation({ summary: 'Get top suppliers by spend on received purchase orders' })
  @ApiOkResponse({ type: [TopSupplierResponse] })
  @Get('top-suppliers')
  public async getTopSuppliers(
    @Query('limit') rawLimit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<TopSupplierResponse[]> {
    const query = new GetTopSuppliersQuery();
    query.organizationId = requireOrganizationId(user);
    query.limit = rawLimit ? Math.max(1, Math.min(50, parseInt(rawLimit, 10))) : 10;
    return this.mediator.execute<GetTopSuppliersQuery, TopSupplierResponse[]>(query);
  }

  @ApiOperation({ summary: 'Get inventory summary KPIs' })
  @ApiOkResponse({ type: InventorySummaryResponse })
  @ApiQuery(PERIOD_QUERY[3])
  @Get('inventory-summary')
  public async getInventorySummary(
    @Query('locationId') locationId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<InventorySummaryResponse> {
    const ctx = buildAnalyticsQueryContext(user!, { locationId });
    const query = new GetInventorySummaryQuery();
    query.organizationId = ctx.organizationId;
    query.locationId = ctx.locationId;
    return this.mediator.execute<GetInventorySummaryQuery, InventorySummaryResponse>(query);
  }

  @ApiOperation({ summary: 'Get stock totals and valuation grouped by location' })
  @ApiOkResponse({ type: [StockByLocationPointResponse] })
  @ApiQuery(PERIOD_QUERY[3])
  @Get('stock-by-location')
  public async getStockByLocation(
    @Query('locationId') locationId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StockByLocationPointResponse[]> {
    const ctx = buildAnalyticsQueryContext(user!, { locationId });
    const query = new GetStockByLocationQuery();
    query.organizationId = ctx.organizationId;
    query.locationId = ctx.locationId;
    return this.mediator.execute<GetStockByLocationQuery, StockByLocationPointResponse[]>(query);
  }

  @ApiOperation({ summary: 'Payment method mix for completed sales in a period' })
  @ApiOkResponse({ type: [PaymentMixPointResponse] })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @Get('payment-mix')
  public async getPaymentMix(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PaymentMixPointResponse[]> {
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId });
    const query = new GetPaymentMixQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    return this.mediator.execute<GetPaymentMixQuery, PaymentMixPointResponse[]>(query);
  }

  @ApiOperation({ summary: 'Stock value grouped by product category' })
  @ApiOkResponse({ type: [CategoryValuePointResponse] })
  @ApiQuery(PERIOD_QUERY[3])
  @Get('stock-value-by-category')
  public async getStockValueByCategory(
    @Query('locationId') locationId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CategoryValuePointResponse[]> {
    const ctx = buildAnalyticsQueryContext(user!, { locationId });
    const query = new GetStockValueByCategoryQuery();
    query.organizationId = ctx.organizationId;
    query.locationId = ctx.locationId;
    return this.mediator.execute<GetStockValueByCategoryQuery, CategoryValuePointResponse[]>(query);
  }

  @ApiOperation({ summary: 'Purchase spend grouped by product category' })
  @ApiOkResponse({ type: [CategoryValuePointResponse] })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @Get('purchase-by-category')
  public async getPurchaseByCategory(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CategoryValuePointResponse[]> {
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId });
    const query = new GetPurchaseByCategoryQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    return this.mediator.execute<GetPurchaseByCategoryQuery, CategoryValuePointResponse[]>(query);
  }

  @ApiOperation({ summary: 'Purchase exception counts (pending POs, drafts awaiting approval)' })
  @ApiOkResponse({ type: PurchaseExceptionsResponse })
  @ApiQuery(PERIOD_QUERY[3])
  @Get('purchase-exceptions')
  public async getPurchaseExceptions(
    @Query('locationId') locationId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PurchaseExceptionsResponse> {
    const ctx = buildAnalyticsQueryContext(user!, { locationId });
    const query = new GetPurchaseExceptionsQuery();
    query.organizationId = ctx.organizationId;
    query.locationId = ctx.locationId;
    return this.mediator.execute<GetPurchaseExceptionsQuery, PurchaseExceptionsResponse>(query);
  }

  @ApiOperation({ summary: 'Product demand tiers (High/Medium/Low) by units sold in period' })
  @ApiOkResponse({ type: [DemandTierPointResponse] })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @Get('product-demand-tiers')
  public async getProductDemandTiers(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<DemandTierPointResponse[]> {
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId });
    const query = new GetProductDemandTiersQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    return this.mediator.execute<GetProductDemandTiersQuery, DemandTierPointResponse[]>(query);
  }

  @ApiOperation({ summary: 'Top margin products in a period' })
  @ApiOkResponse({ type: [ProductMarginRankResponse] })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @ApiQuery({ name: 'limit', required: false })
  @Get('top-margin-products')
  public async getTopMarginProducts(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @Query('limit') rawLimit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductMarginRankResponse[]> {
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId });
    const query = new GetTopMarginProductsQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    query.limit = rawLimit ? Math.max(1, Math.min(50, parseInt(rawLimit, 10))) : 10;
    return this.mediator.execute<GetTopMarginProductsQuery, ProductMarginRankResponse[]>(query);
  }

  @ApiOperation({ summary: 'Highest average unit price products in a period' })
  @ApiOkResponse({ type: [ProductMarginRankResponse] })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @ApiQuery({ name: 'limit', required: false })
  @Get('costly-products')
  public async getCostlyProducts(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @Query('limit') rawLimit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductMarginRankResponse[]> {
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId });
    const query = new GetCostlyProductsQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    query.limit = rawLimit ? Math.max(1, Math.min(50, parseInt(rawLimit, 10))) : 10;
    return this.mediator.execute<GetCostlyProductsQuery, ProductMarginRankResponse[]>(query);
  }

  @ApiOperation({ summary: 'Fast-moving products by units sold in period' })
  @ApiOkResponse({ type: [ProductMovementRankResponse] })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @ApiQuery({ name: 'limit', required: false })
  @Get('fast-moving-products')
  public async getFastMovingProducts(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @Query('limit') rawLimit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductMovementRankResponse[]> {
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId });
    const query = new GetFastMovingProductsQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    query.limit = rawLimit ? Math.max(1, Math.min(50, parseInt(rawLimit, 10))) : 10;
    return this.mediator.execute<GetFastMovingProductsQuery, ProductMovementRankResponse[]>(query);
  }

  @ApiOperation({ summary: 'Dead stock — on-hand with no sales in stale window' })
  @ApiOkResponse({ type: [ProductMovementRankResponse] })
  @ApiQuery(PERIOD_QUERY[3])
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'staleDays', required: false, description: 'Default 90' })
  @Get('dead-stock')
  public async getDeadStock(
    @Query('locationId') locationId?: string,
    @Query('limit') rawLimit?: string,
    @Query('staleDays') rawStaleDays?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductMovementRankResponse[]> {
    const ctx = buildAnalyticsQueryContext(user!, { locationId });
    const query = new GetDeadStockQuery();
    query.organizationId = ctx.organizationId;
    query.locationId = ctx.locationId;
    query.limit = rawLimit ? Math.max(1, Math.min(50, parseInt(rawLimit, 10))) : 10;
    query.staleDays = rawStaleDays ? Math.max(7, Math.min(365, parseInt(rawStaleDays, 10))) : 90;
    return this.mediator.execute<GetDeadStockQuery, ProductMovementRankResponse[]>(query);
  }

  @ApiOperation({ summary: 'Supplier unit cost comparison for multi-source products' })
  @ApiOkResponse({ type: [SupplierPricePointResponse] })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @ApiQuery({ name: 'limit', required: false })
  @Get('supplier-price-comparison')
  public async getSupplierPriceComparison(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @Query('limit') rawLimit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<SupplierPricePointResponse[]> {
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId });
    const query = new GetSupplierPriceComparisonQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    query.limit = rawLimit ? Math.max(1, Math.min(100, parseInt(rawLimit, 10))) : 30;
    return this.mediator.execute<GetSupplierPriceComparisonQuery, SupplierPricePointResponse[]>(query);
  }

  @ApiOperation({ summary: 'Inventory status breakdown (Normal/Low/Out/Over/Dead)' })
  @ApiOkResponse({ type: InventoryStatusResponse })
  @ApiQuery(PERIOD_QUERY[3])
  @ApiQuery({ name: 'staleDays', required: false })
  @Get('inventory-status')
  public async getInventoryStatus(
    @Query('locationId') locationId?: string,
    @Query('staleDays') rawStaleDays?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<InventoryStatusResponse> {
    const ctx = buildAnalyticsQueryContext(user!, { locationId });
    const query = new GetInventoryStatusQuery();
    query.organizationId = ctx.organizationId;
    query.locationId = ctx.locationId;
    query.staleDays = rawStaleDays ? Math.max(7, Math.min(365, parseInt(rawStaleDays, 10))) : 90;
    return this.mediator.execute<GetInventoryStatusQuery, InventoryStatusResponse>(query);
  }

  @ApiOperation({ summary: 'Inventory status trend over time (Normal/Low/Out/Over/Dead)' })
  @ApiOkResponse({ type: InventoryStatusTrendPointResponse, isArray: true })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @ApiQuery({ name: 'staleDays', required: false })
  @Get('inventory-status-trend')
  public async getInventoryStatusTrend(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @Query('staleDays') rawStaleDays?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<InventoryStatusTrendPointResponse[]> {
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId });
    const query = new GetInventoryStatusTrendQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    query.trunc = ctx.trunc;
    query.staleDays = rawStaleDays ? Math.max(7, Math.min(365, parseInt(rawStaleDays, 10))) : 90;
    return this.mediator.execute<GetInventoryStatusTrendQuery, InventoryStatusTrendPointResponse[]>(query);
  }

  @ApiOperation({ summary: 'Damaged and written-off stock in period' })
  @ApiOkResponse({ type: StockDamageSummaryResponse })
  @ApiQuery(PERIOD_QUERY[0])
  @ApiQuery(PERIOD_QUERY[1])
  @ApiQuery(PERIOD_QUERY[2])
  @ApiQuery(PERIOD_QUERY[3])
  @ApiQuery({ name: 'limit', required: false })
  @Get('stock-damage-summary')
  public async getStockDamageSummary(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('locationId') locationId?: string,
    @Query('limit') rawLimit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StockDamageSummaryResponse> {
    const ctx = buildAnalyticsQueryContext(user!, { period, from, to, locationId });
    const query = new GetStockDamageSummaryQuery();
    query.organizationId = ctx.organizationId;
    query.from = ctx.from;
    query.to = ctx.to;
    query.locationId = ctx.locationId;
    query.limit = rawLimit ? Math.max(1, Math.min(50, parseInt(rawLimit, 10))) : 10;
    return this.mediator.execute<GetStockDamageSummaryQuery, StockDamageSummaryResponse>(query);
  }
}
