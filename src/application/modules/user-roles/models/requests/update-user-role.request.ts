import { AutoMap } from '@automapper/classes';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateUserRoleRequest {
  @ApiPropertyOptional() @IsOptional() @IsUUID() @AutoMap() public roleId?: string;
  @ApiPropertyOptional({ description: 'Re-scope to a different store, or omit to leave unchanged. Send null to clear (org-wide).' })
  @IsOptional() @IsUUID() @AutoMap() public locationId?: string;
}
