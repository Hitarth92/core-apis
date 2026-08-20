import { AutoMap } from '@automapper/classes';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateQuickChargeRequest {
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public label?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @AutoMap() public amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @AutoMap() public enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @AutoMap() public sortOrder?: number;
}
