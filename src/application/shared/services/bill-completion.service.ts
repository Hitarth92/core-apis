import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource, EntityManager } from 'typeorm';
import {
  BILL_ITEM_REPO,
  BILL_REPO,
  COMMISSION_PAYABLE_REPO,
  CREDIT_APPROVAL_REQUEST_REPO,
  CUSTOMER_CREDIT_TRANSACTION_REPO,
  CUSTOMER_REPO,
  CUSTOMER_TYPE_RULE_REPO,
  INVENTORY_REPO,
  STOCK_MOVEMENT_REPO,
} from '../../constants';
import { IBillItemRepo, IBillRepo } from '../../modules/bills';
import { Bill, BillItem } from '../../modules/bills/domain';
import { ICustomerRepo } from '../../modules/customers';
import { Customer } from '../../modules/customers/domain';
import { ICustomerTypeRuleRepo } from '../../modules/billing-settings';
import {
  ICommissionPayableRepo,
  ICreditApprovalRequestRepo,
  ICustomerCreditTransactionRepo,
} from '../../modules/credit-approvals';
import { IInventoryRepo } from '../../modules/inventory';
import { IStockMovementRepo } from '../../modules/stock-movements';
import { StockMovementInput } from '../interfaces/i-stock-operation.interface';
import {
  EBillStatus,
  ECommissionStatus,
  ECreditApprovalStatus,
  ECreditTransactionType,
  EMovementType,
  ESaleType,
} from '../../../infrastructure/persistence/entities';

export class CreditLimitExceededError extends BadRequestException {
  public readonly approvalRequestId: string;

  constructor(approvalRequestId: string) {
    super({
      message: 'Sale exceeds customer credit limit — sent for approval',
      approvalRequestId,
    });
    this.approvalRequestId = approvalRequestId;
  }
}

@Injectable()
export class BillCompletionService {
  constructor(
    @Inject(BILL_REPO) private readonly billRepo: IBillRepo,
    @Inject(BILL_ITEM_REPO) private readonly itemRepo: IBillItemRepo,
    @Inject(INVENTORY_REPO) private readonly inventoryRepo: IInventoryRepo,
    @Inject(STOCK_MOVEMENT_REPO) private readonly movementRepo: IStockMovementRepo,
    @Inject(CUSTOMER_REPO) private readonly customerRepo: ICustomerRepo,
    @Inject(CUSTOMER_TYPE_RULE_REPO) private readonly typeRuleRepo: ICustomerTypeRuleRepo,
    @Inject(CUSTOMER_CREDIT_TRANSACTION_REPO) private readonly creditTxnRepo: ICustomerCreditTransactionRepo,
    @Inject(CREDIT_APPROVAL_REQUEST_REPO) private readonly creditApprovalRepo: ICreditApprovalRequestRepo,
    @Inject(COMMISSION_PAYABLE_REPO) private readonly commissionRepo: ICommissionPayableRepo,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(BillCompletionService.name) private readonly logger: PinoLogger,
  ) {}

  public async completeBill(billId: string, performedById: string, creditOverrideApproved = false): Promise<Bill> {
    const bill = await this.billRepo.getAsync(billId);
    if (!bill) throw new NotFoundException(`Bill ${billId} not found`);
    const items = (bill.items?.length ? bill.items : await this.itemRepo.allAsync({ billId })) ?? [];

    if (bill.saleType === ESaleType.Credit && !creditOverrideApproved) {
      await this.enforceCreditLimit(bill, performedById);
    }

    await this.dataSource.transaction(async (manager) => {
      if (bill.saleType === ESaleType.Black) {
        await this.deductBlackStock(bill, items, performedById, manager);
      } else {
        await this.deductOfficialStock(bill, items, manager);
      }
    });

    if (bill.saleType === ESaleType.Black) {
      await this.recordCommission(bill);
    }
    if (bill.saleType === ESaleType.Credit) {
      await this.applyCredit(bill, performedById);
    }

    bill.billedAt = new Date();
    bill.status = EBillStatus.Completed;
    await this.billRepo.updateAsync({ ...bill, items: undefined });
    return this.billRepo.getAsync(billId);
  }

  private async enforceCreditLimit(bill: Bill, requestedById: string): Promise<void> {
    if (!bill.customerId) throw new BadRequestException('Credit sale requires a customer');
    const customer = await this.customerRepo.getAsync(bill.customerId);
    if (!customer) throw new NotFoundException(`Customer ${bill.customerId} not found`);
    if (customer.creditLimit == null) throw new BadRequestException('Customer has no credit limit set');

    const wouldBeBalance = Number(customer.creditBalance) + Number(bill.totalAmount);
    if (wouldBeBalance > Number(customer.creditLimit)) {
      if (await this.shouldSkipCreditApproval(bill, customer)) {
        this.logger.info({ billId: bill.id, customerId: customer.id }, 'credit-limit.skip-approval');
        return;
      }
      const approval = await this.creditApprovalRepo.createAsync({
        organizationId: bill.organizationId,
        customerId: bill.customerId,
        billId: bill.id,
        requestedAmount: bill.totalAmount,
        requestedById,
        status: ECreditApprovalStatus.Pending,
      } as never);
      this.logger.warn({ billId: bill.id, approvalId: approval.id }, 'credit-limit.exceeded');
      throw new CreditLimitExceededError(approval.id);
    }
  }

  private async shouldSkipCreditApproval(bill: Bill, customer: Customer): Promise<boolean> {
    if (customer.skipOverLimitApproval != null) return customer.skipOverLimitApproval;
    const type = bill.customerType ?? customer.customerType;
    if (!type) return false;
    const rule = await this.typeRuleRepo.findOneAsync({
      organizationId: bill.organizationId,
      customerType: type,
    });
    return rule?.skipOverLimitApproval === true;
  }

  private async applyCredit(bill: Bill, performedById: string): Promise<void> {
    const customer = await this.customerRepo.getAsync(bill.customerId);
    if (!customer) throw new NotFoundException(`Customer ${bill.customerId} not found`);
    const before = Number(customer.creditBalance);
    const after = before + Number(bill.totalAmount);
    customer.creditBalance = after;
    await this.customerRepo.updateAsync(customer);
    await this.creditTxnRepo.createAsync({
      customerId: customer.id,
      billId: bill.id,
      type: ECreditTransactionType.CreditSale,
      amount: bill.totalAmount,
      balanceBefore: before,
      balanceAfter: after,
      performedById,
    } as never);
  }

  private async deductOfficialStock(bill: Bill, items: BillItem[], manager: EntityManager): Promise<void> {
    for (const item of items) {
      const inv = await this.inventoryRepo.findByOrgLocationProductAsync(
        bill.organizationId,
        bill.locationId,
        item.productId,
        manager,
      );
      if (!inv) throw new BadRequestException(`No inventory found for product ${item.productId} at this location`);
      await this.inventoryRepo.deductStockAsync(inv.id, Number(item.quantity), manager);
    }
  }

  private async deductBlackStock(
    bill: Bill,
    items: BillItem[],
    performedById: string,
    manager: EntityManager,
  ): Promise<void> {
    for (const item of items) {
      const inv = await this.inventoryRepo.findByOrgLocationProductAsync(
        bill.organizationId,
        bill.locationId,
        item.productId,
        manager,
      );
      if (!inv) {
        throw new BadRequestException(`No black stock for product ${item.productId} at this location — add black stock first`);
      }
      const before = Number(inv.quantityUnpublished);
      const updated = await this.inventoryRepo.deductUnpublishedStockAsync(inv.id, Number(item.quantity), manager);
      const movement = Object.assign(new StockMovementInput(), {
        inventoryId: inv.id,
        locationId: bill.locationId,
        productId: item.productId,
        performedById,
        referenceId: bill.id,
        referenceType: 'bill',
        movementType: EMovementType.StockOut,
        quantity: Number(item.quantity),
        quantityBefore: before,
        quantityAfter: Number(updated.quantityUnpublished),
        isUnpublishedEntry: true,
        notes: `Black sale ${bill.billNumber}`,
      });
      await this.movementRepo.createWithManagerAsync(movement, manager);
    }
  }

  private async recordCommission(bill: Bill): Promise<void> {
    if (!bill.facilitatorUserId && !bill.facilitatorName) return;
    if (!bill.commissionAmount) return;
    await this.commissionRepo.createAsync({
      organizationId: bill.organizationId,
      billId: bill.id,
      facilitatorUserId: bill.facilitatorUserId,
      facilitatorName: bill.facilitatorName,
      amount: bill.commissionAmount,
      status: ECommissionStatus.Owed,
    } as never);
  }
}
