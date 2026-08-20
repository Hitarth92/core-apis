import { RpcForbiddenException } from '../base';

export class LocationNotOwnedByOrgException extends RpcForbiddenException {
  constructor(objectOrError?: string | object, description = 'Access denied: location does not belong to your organization.') {
    super(objectOrError, description);
  }
}
