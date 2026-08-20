import { RpcForbiddenException } from '../base';

export class UserRoleNotAllowedException extends RpcForbiddenException {
  constructor(objectOrError?: string | object, description = 'The role cannot be assigned, or the target user is not in your organization.') {
    super(objectOrError, description);
  }
}
