import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

export class RoleResponse {
  @ApiProperty() @AutoMap() public id: string;
  @ApiProperty() @AutoMap() public organizationId: string;
  @ApiProperty() @AutoMap() public name: string;
  @ApiProperty() @AutoMap() public permissions: Record<string, any>;
  @ApiProperty() @AutoMap(() => Date) public createdAt?: Date;
}
