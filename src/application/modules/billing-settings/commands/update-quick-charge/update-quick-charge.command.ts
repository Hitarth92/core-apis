import { AutoMap } from '@automapper/classes';
import { CommandBase } from '../../../../../common';

export class UpdateQuickChargeCommand extends CommandBase {
  public id: string;
  public organizationId: string;
  @AutoMap() public label?: string;
  @AutoMap() public amount?: number;
  @AutoMap() public enabled?: boolean;
  @AutoMap() public sortOrder?: number;
}
