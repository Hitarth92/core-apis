import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { CreditApprovalRequest } from './domain';

export interface CreditApprovalRequestFilter {
  organizationId?: string;
  status?: string;
  customerId?: string;
  billId?: string;
  requestedById?: string;
}

export const CREDIT_APPROVAL_REQUEST_REPO = 'CREDIT_APPROVAL_REQUEST_REPO';
export type ICreditApprovalRequestRepo = IBaseRepo<
  CreditApprovalRequest,
  string,
  PageableFilter<CreditApprovalRequestFilter>,
  Filter<CreditApprovalRequestFilter>
>;
