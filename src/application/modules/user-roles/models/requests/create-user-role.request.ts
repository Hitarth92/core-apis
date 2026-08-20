import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateUserRoleRequest {
  @ApiProperty() @IsNotEmpty() @IsUUID() @AutoMap() public userId: string;
  @ApiProperty() @IsNotEmpty() @IsUUID() @AutoMap() public roleId: string;
  @ApiPropertyOptional({ description: 'Scope this role to a single location. Omit for an org-wide role.' })
  @IsOptional() @IsUUID() @AutoMap() public locationId?: string;
}
