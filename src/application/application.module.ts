import { DynamicModule, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from './modules/auth';
import { OrganizationsModule } from './modules/organizations';
import { CategoriesModule } from './modules/categories';
import { ProductsModule } from './modules/products';
import { SuppliersModule } from './modules/suppliers';
import { InventoryModule } from './modules/inventory';
import { PurchaseOrdersModule } from './modules/purchase-orders';
import { CustomersModule } from './modules/customers';
import { OrdersModule } from './modules/orders';
import { InvoicesModule } from './modules/invoices';
import { StockTransfersModule } from './modules/stock-transfers';
import { ExpensesModule } from './modules/expenses';
import { BillingSettingsModule } from './modules/billing-settings';
import { PlatformConfigurationsModule } from './modules/platform-configurations';
import { UsersModule } from './modules/users';
import { RolesModule } from './modules/roles';
import { UserRolesModule } from './modules/user-roles';
import { StockMovementsModule } from './modules/stock-movements';
import { PurchaseItemsModule } from './modules/purchase-items';
import { ActivityLogsModule } from './modules/activity-logs';
import { BillsModule } from './modules/bills';
import { CreditApprovalsModule } from './modules/credit-approvals';
import { PaymentTransactionsModule } from './modules/payment-transactions';
import { ItemReturnsModule } from './modules/item-returns';
import { NotificationsModule } from './modules/notifications';
import { ReportGenerationLogsModule } from './modules/report-generation-logs';
import { LocationsModule } from './modules/locations';
import { ProductLogsModule } from './modules/product-logs';
import { UnpublishedStockModule } from './modules/unpublished-stock';
import { SharedModule } from './shared';
import { CommonUtilityModule } from './modules/common-utility';
import { VehiclesModule } from './modules/vehicles';
import { AnalyticsModule } from './modules/analytics';
import { DriversModule } from './modules/drivers';
import { MaintenanceModule } from './modules/maintenance';
import { TripsModule } from './modules/trips';
import { VehicleExpensesModule } from './modules/vehicle-expenses';

import { CqrsMediator, CommonModule } from '../common';
import { MailTemplatesModule } from './modules/mail-templates';


@Module({})
export class ApplicationModule {
  public static forRoot(): DynamicModule {
    return {
      global: true,
      module: ApplicationModule,
      imports: [
        CqrsModule,
        TerminusModule,
        AuthModule,
        OrganizationsModule,
        CategoriesModule,
        ProductsModule,
        SuppliersModule,
        InventoryModule,
        PurchaseOrdersModule,
        CustomersModule,
        OrdersModule,
        InvoicesModule,
        StockTransfersModule,
        ExpensesModule,
        BillingSettingsModule,
        PlatformConfigurationsModule,
        UsersModule,
        RolesModule,
        UserRolesModule,
        StockMovementsModule,
        PurchaseItemsModule,
        ActivityLogsModule,
        BillsModule,
        CreditApprovalsModule,
        PaymentTransactionsModule,
        ItemReturnsModule,
        NotificationsModule,
        ReportGenerationLogsModule,
        LocationsModule,
        ProductLogsModule,
        UnpublishedStockModule,
        SharedModule,
        CommonUtilityModule,
        VehiclesModule,
        AnalyticsModule,
        DriversModule,
        MaintenanceModule,
        TripsModule,
        VehicleExpensesModule,
        CommonModule,
        MailTemplatesModule,
      ],
      controllers: [],
      providers: [CqrsMediator],
      exports: [CqrsMediator],
    };
  }
}
