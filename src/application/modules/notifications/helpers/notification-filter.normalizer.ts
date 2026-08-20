import { Injectable } from '@nestjs/common';
import { IFilterNormalizer, Filter, PageableFilter } from '../../../../common';
import { NotificationFilter } from '../domain';
import { NotificationFeatureOptions } from '../options';

@Injectable()
export class NotificationFilterNormalizer implements IFilterNormalizer<NotificationFilter> {
  constructor(public options: NotificationFeatureOptions) {}

  public normalize(filter: Filter<NotificationFilter>): Filter<NotificationFilter> {
    filter.$orderBy = filter.$orderBy ?? this.options.orderBy;
    filter.$order = filter.$order ?? this.options.order;
    return filter;
  }

  public pageableNormalize(filter: PageableFilter<NotificationFilter>): PageableFilter<NotificationFilter> {
    filter = this.normalize(filter);
    filter.$page = filter.$page ?? this.options.page;
    filter.$perPage = filter.$perPage ?? this.options.perPage;
    return filter;
  }
}
