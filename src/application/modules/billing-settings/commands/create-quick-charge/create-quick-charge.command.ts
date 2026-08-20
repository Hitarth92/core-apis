import { AutoMap } from '@automapper/classes';
import { CommandBase } from '../../../../../common';

export class CreateQuickChargeCommand extends CommandBase {
  @AutoMap() public organizationId: string;
  @AutoMap() public label: string;
  @AutoMap() public amount: number;
  @AutoMap() public enabled?: boolean;
  @AutoMap() public sortOrder?: number;
}
