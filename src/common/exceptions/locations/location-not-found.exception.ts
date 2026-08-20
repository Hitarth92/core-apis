import { RpcNotFoundException } from '../base';

export class LocationNotFoundException extends RpcNotFoundException {
  constructor(objectOrError?: string | object, description = 'Location not found.') {
    super(objectOrError, description);
  }
}
