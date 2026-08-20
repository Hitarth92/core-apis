import { Injectable } from '@nestjs/common';
import { IFilterNormalizer, Filter, PageableFilter } from '../../../../common';
import { StockTransferFilter } from '../i-stock-transfer.repo';
import { StockTransferFeatureOptions } from '../options/stock-transfer-feature.options';

@Injectable()
export class StockTransferFilterNormalizer implements IFilterNormalizer<StockTransferFilter> {
  constructor(public options: StockTransferFeatureOptions) {}

  public normalize(filter: Filter<StockTransferFilter>): Filter<StockTransferFilter> {
    filter.$orderBy = filter.$orderBy ?? this.options.orderBy;
    filter.$order = filter.$order ?? this.options.order;
    return filter;
  }

  public pageableNormalize(filter: PageableFilter<StockTransferFilter>): PageableFilter<StockTransferFilter> {
    filter = this.normalize(filter);
    filter.$page = filter.$page ?? this.options.page;
    filter.$perPage = filter.$perPage ?? this.options.perPage;
    return filter;
  }
}
