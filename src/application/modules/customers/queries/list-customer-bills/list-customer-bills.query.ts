export class ListCustomerBillsQuery {
  public customerId: string;
  public organizationId: string;
  public excludeBlack: boolean = false;
  public $page?: number;
  public $perPage?: number;
}
