import { RpcForbiddenException } from '../base';

export class LocationAccessDeniedException extends RpcForbiddenException {
  constructor(objectOrError?: string | object, description = 'Access denied: your role is not scoped to this location.') {
    super(objectOrError, description);
  }
}
