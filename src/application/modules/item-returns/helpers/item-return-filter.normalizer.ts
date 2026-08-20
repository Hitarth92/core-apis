import { Injectable } from '@nestjs/common';
import { IFilterNormalizer, Filter, PageableFilter } from '../../../../common';
import { ItemReturnFilter } from '../domain';
import { ItemReturnFeatureOptions } from '../options';

@Injectable()
export class ItemReturnFilterNormalizer implements IFilterNormalizer<ItemReturnFilter> {
  constructor(public options: ItemReturnFeatureOptions) {}

  public normalize(filter: Filter<ItemReturnFilter>): Filter<ItemReturnFilter> {
    filter.$orderBy = filter.$orderBy ?? this.options.orderBy;
    filter.$order = filter.$order ?? this.options.order;
    return filter;
  }

  public pageableNormalize(filter: PageableFilter<ItemReturnFilter>): PageableFilter<ItemReturnFilter> {
    filter = this.normalize(filter);
    filter.$page = filter.$page ?? this.options.page;
    filter.$perPage = filter.$perPage ?? this.options.perPage;
    return filter;
  }
}
