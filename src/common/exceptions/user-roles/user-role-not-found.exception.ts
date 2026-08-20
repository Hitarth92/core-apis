import { RpcNotFoundException } from '../base';

export class UserRoleNotFoundException extends RpcNotFoundException {
  constructor(objectOrError?: string | object, description = 'User role assignment not found.') {
    super(objectOrError, description);
  }
}
