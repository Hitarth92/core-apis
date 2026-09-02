import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponse {
  @ApiProperty() @AutoMap() public id: string;
  @ApiProperty() @AutoMap() public email: string;
  @ApiProperty() @AutoMap() public firstName: string;
  @ApiProperty() @AutoMap() public lastName: string;
  @ApiPropertyOptional() @AutoMap() public phone?: string;
  @ApiProperty() @AutoMap() public organizationId: string;
  @ApiPropertyOptional() @AutoMap() public locationId?: string;
  @ApiProperty() @AutoMap() public isActive: boolean;
  @ApiPropertyOptional({ type: [String] }) public roleNames?: string[];
}
