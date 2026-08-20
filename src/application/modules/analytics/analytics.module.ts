import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AnalyticsController } from './analytics.controller';
import { GetFleetSummaryKpisHandler } from './queries/get-fleet-summary';
import { GetFinancialKpisHandler } from './queries/get-financial-kpis';
import { GetSalesSummaryHandler } from './queries/get-sales-summary';
import { GetRevenueTrendHandler } from './queries/get-revenue-trend';
import { GetTopProductsHandler } from './queries/get-top-products';
import { GetTopCustomersHandler } from './queries/get-top-customers';
import { GetPurchaseSummaryHandler } from './queries/get-purchase-summary';
import { GetPurchaseTrendHandler } from './queries/get-purchase-trend';
import { GetTopSuppliersHandler } from './queries/get-top-suppliers';
import { GetInventorySummaryHandler } from './queries/get-inventory-summary';
import { GetStockByLocationHandler } from './queries/get-stock-by-location';
import { GetPaymentMixHandler } from './queries/get-payment-mix';
import { GetStockValueByCategoryHandler } from './queries/get-stock-value-by-category';
import { GetPurchaseByCategoryHandler } from './queries/get-purchase-by-category';
import { GetPurchaseExceptionsHandler } from './queries/get-purchase-exceptions';
import { GetProductDemandTiersHandler } from './queries/get-product-demand-tiers';
import { GetFastMovingProductsHandler } from './queries/get-fast-moving-products';
import { GetDeadStockHandler } from './queries/get-dead-stock';
import { GetTopMarginProductsHandler } from './queries/get-top-margin-products';
import { GetCostlyProductsHandler } from './queries/get-costly-products';
import { GetSupplierPriceComparisonHandler } from './queries/get-supplier-price-comparison';
import { GetInventoryStatusHandler } from './queries/get-inventory-status';
import { GetInventoryStatusTrendHandler } from './queries/get-inventory-status-trend';
import { GetStockDamageSummaryHandler } from './queries/get-stock-damage-summary';

@Module({
  imports: [CqrsModule],
  controllers: [AnalyticsController],
  providers: [
    GetFleetSummaryKpisHandler,
    GetFinancialKpisHandler,
    GetSalesSummaryHandler,
    GetRevenueTrendHandler,
    GetTopProductsHandler,
    GetTopCustomersHandler,
    GetPurchaseSummaryHandler,
    GetPurchaseTrendHandler,
    GetTopSuppliersHandler,
    GetInventorySummaryHandler,
    GetStockByLocationHandler,
    GetPaymentMixHandler,
    GetStockValueByCategoryHandler,
    GetPurchaseByCategoryHandler,
    GetPurchaseExceptionsHandler,
    GetProductDemandTiersHandler,
    GetFastMovingProductsHandler,
    GetDeadStockHandler,
    GetTopMarginProductsHandler,
    GetCostlyProductsHandler,
    GetSupplierPriceComparisonHandler,
    GetInventoryStatusHandler,
    GetInventoryStatusTrendHandler,
    GetStockDamageSummaryHandler,
  ],
})
export class AnalyticsModule {}
