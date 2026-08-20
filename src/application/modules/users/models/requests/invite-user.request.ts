import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export class InviteUserRequest {
  @ApiProperty() @IsNotEmpty() @IsEmail() @AutoMap() public email: string;
  @ApiProperty({ description: 'System Role UUID to grant on acceptance (org-scoped roles only, not SuperAdmin).' })
  @IsNotEmpty() @IsUUID() @AutoMap() public roleId: string;
  @ApiPropertyOptional({ description: 'Required when the caller is SuperAdmin (org-less). Ignored for OrgAdmin.' })
  @IsOptional() @IsUUID() @AutoMap() public organizationId?: string;
  @ApiPropertyOptional({ description: 'Scope the role to a single store/warehouse. Omit for org-wide.' })
  @IsOptional() @IsUUID() @AutoMap() public locationId?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) @AutoMap(() => [String]) public roles?: string[];
  @ApiPropertyOptional() @IsOptional() @IsUrl() @AutoMap() public redirectUrl?: string;
}
