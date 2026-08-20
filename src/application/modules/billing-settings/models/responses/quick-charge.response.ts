import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

export class QuickChargeResponse {
  @ApiProperty() @AutoMap() public id: string;
  @ApiProperty() @AutoMap() public organizationId: string;
  @ApiProperty() @AutoMap() public label: string;
  @ApiProperty() @AutoMap() public amount: number;
  @ApiProperty() @AutoMap() public enabled: boolean;
  @ApiProperty() @AutoMap() public sortOrder: number;
  @ApiProperty() @AutoMap(() => Date) public createdAt: Date;
}
