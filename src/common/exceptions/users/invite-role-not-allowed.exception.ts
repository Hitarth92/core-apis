import { RpcForbiddenException } from '../base';

export class InviteRoleNotAllowedException extends RpcForbiddenException {
  constructor(objectOrError?: string | object, description = 'This role cannot be assigned through an invite, or does not belong to your organization’s role set.') {
    super(objectOrError, description);
  }
}
