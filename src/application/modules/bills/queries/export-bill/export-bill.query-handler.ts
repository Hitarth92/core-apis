import { Inject } from '@nestjs/common';
import type { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict } from '../../../../../common';
import { BILL_REPO } from '../../../../constants';
import { IBillRepo } from '../..';
import { PDF_EXPORT_SERVICE, IPdfExportService, PdfDocument } from '../../../../../common';
import { ExportBillQuery } from './export-bill.query';
import { Bill, BillItem } from '../../domain';

@QueryHandlerStrict(ExportBillQuery)
export class ExportBillQueryHandler implements IQueryHandler<ExportBillQuery, PdfDocument> {
  constructor(
    @Inject(BILL_REPO) private readonly billRepo: IBillRepo,
    @Inject(PDF_EXPORT_SERVICE) private readonly pdfService: IPdfExportService,
    @InjectPinoLogger(ExportBillQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ExportBillQuery): Promise<PdfDocument> {
    this.logger.info(`Executing Query "${ExportBillQuery.name}"`);

    const bill: Bill = await this.billRepo.getAsync(query.id);
    const context = this.buildContext(bill);
    const filename = `bill-${bill.billNumber}.pdf`;

    return this.pdfService.generateFromTemplateAsync('bill', context, filename);
  }

  private buildContext(bill: Bill): Record<string, unknown> {
    return {
      organizationName: 'Organization',
      organizationAddress: '',
      organizationEmail: '',
      billNumber: bill.billNumber,
      status: bill.status,
      customerName: bill.walkInName ?? `Customer (${bill.customerId ?? 'Walk-in'})`,
      customerPhone: bill.walkInPhone ?? '',
      customerEmail: '',
      location: bill.locationId,
      createdBy: bill.createdById,
      billedAt: bill.billedAt
        ? new Date(bill.billedAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : new Date().toLocaleDateString('en-IN'),
      items: (bill.items ?? []).map((item: BillItem) => ({
        name: item.productId,
        description: '',
        sku: item.variantId ?? '',
        quantity: item.quantity,
        unitPrice: this.formatCurrency(item.unitPrice),
        taxRate: item.taxRate ?? 0,
        total: this.formatCurrency(item.lineTotal),
      })),
      subtotal: this.formatCurrency(bill.subtotal),
      taxAmount: this.formatCurrency(bill.taxAmount),
      discountAmount: this.formatCurrency(bill.discountAmount),
      totalAmount: this.formatCurrency(bill.totalAmount),
      paymentMethod: bill.paymentMethod ?? '',
      notes: bill.notes ?? '',
    };
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(value ?? 0);
  }
}
