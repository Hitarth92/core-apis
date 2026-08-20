import { AutoMap } from '@automapper/classes';

export class CustomerFilter {
  @AutoMap() public organizationId?: string;
  @AutoMap() public name?: string;
  @AutoMap() public phone?: string;
  @AutoMap() public hasCreditLimit?: boolean;
  @AutoMap() public $page?: number;
  @AutoMap() public $perPage?: number;
}
