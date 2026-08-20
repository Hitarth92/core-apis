import { RpcForbiddenException } from '../base';

export class ResourceNotOwnedByOrgException extends RpcForbiddenException {
  constructor(resource: string) {
    super(undefined, `Access denied: ${resource} does not belong to your organization.`);
  }
}
