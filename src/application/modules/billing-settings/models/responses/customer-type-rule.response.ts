import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ECustomerType } from '../../../../../infrastructure/persistence/entities';

export class CustomerTypeRuleResponse {
  @ApiProperty() @AutoMap() public id: string;
  @ApiProperty() @AutoMap() public organizationId: string;
  @ApiProperty({ enum: ECustomerType }) @AutoMap(() => String) public customerType: ECustomerType;
  @ApiProperty() @AutoMap() public discountPercent: number;
  @ApiPropertyOptional() @AutoMap() public defaultCreditLimit?: number | null;
  @ApiProperty() @AutoMap() public skipOverLimitApproval: boolean;
  @ApiProperty() @AutoMap(() => Date) public createdAt: Date;
}
