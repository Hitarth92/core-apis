import { AutoMap } from '@automapper/classes';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateCustomerTypeRuleRequest {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) @AutoMap() public discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @AutoMap() public defaultCreditLimit?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @AutoMap() public skipOverLimitApproval?: boolean;
}
