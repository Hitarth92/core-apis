import { AutoMap } from '@automapper/classes';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class SearchCustomersRequest {
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public organizationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public phone?: string;
  @ApiPropertyOptional({ description: 'When true, only customers with creditLimit > 0' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  @AutoMap()
  public hasCreditLimit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @AutoMap() public $page?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @AutoMap() public $perPage?: number;
}
