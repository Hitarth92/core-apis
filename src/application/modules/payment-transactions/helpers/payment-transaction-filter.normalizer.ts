import { Injectable } from '@nestjs/common';
import { IFilterNormalizer, Filter, PageableFilter } from '../../../../common';
import { PaymentTransactionFilter } from '../domain';
import { PaymentTransactionFeatureOptions } from '../options';

@Injectable()
export class PaymentTransactionFilterNormalizer implements IFilterNormalizer<PaymentTransactionFilter> {
  constructor(public options: PaymentTransactionFeatureOptions) {}

  public normalize(filter: Filter<PaymentTransactionFilter>): Filter<PaymentTransactionFilter> {
    filter.$orderBy = filter.$orderBy ?? this.options.orderBy;
    filter.$order = filter.$order ?? this.options.order;
    return filter;
  }

  public pageableNormalize(filter: PageableFilter<PaymentTransactionFilter>): PageableFilter<PaymentTransactionFilter> {
    filter = this.normalize(filter);
    filter.$page = filter.$page ?? this.options.page;
    filter.$perPage = filter.$perPage ?? this.options.perPage;
    return filter;
  }
}
