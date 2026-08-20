import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ECustomerType } from '../../../../../infrastructure/persistence/entities';

export class CreateCustomerRequest {
  @ApiProperty() @IsNotEmpty() @IsString() @AutoMap() public name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @AutoMap() public creditLimit?: number;
  @ApiPropertyOptional({ enum: ECustomerType }) @IsOptional() @IsEnum(ECustomerType) @AutoMap(() => String) public customerType?: ECustomerType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) @AutoMap() public discountPercent?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @AutoMap() public skipOverLimitApproval?: boolean | null;
}
