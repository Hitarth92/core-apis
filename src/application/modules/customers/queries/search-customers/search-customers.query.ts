import { AutoMap } from '@automapper/classes';
import { EOrder, PageableFilter, QueryBase } from '../../../../../common';
import { CustomerFilter } from '../../domain';

export class SearchCustomersQuery extends QueryBase implements PageableFilter<CustomerFilter> {
  @AutoMap() public organizationId?: string;
  @AutoMap() public name?: string;
  @AutoMap() public phone?: string;
  @AutoMap() public hasCreditLimit?: boolean;
  @AutoMap() public $page?: number;
  @AutoMap() public $perPage?: number;
  @AutoMap() public $orderBy?: string;
  @AutoMap(() => String) public $order?: EOrder;
}
