import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ECustomerType } from '../../../../../infrastructure/persistence/entities';

export class CustomerResponse {
  @ApiProperty() @AutoMap() public id: string;
  @ApiProperty() @AutoMap() public organizationId: string;
  @ApiProperty() @AutoMap() public name: string;
  @ApiPropertyOptional() @AutoMap() public email?: string;
  @ApiPropertyOptional() @AutoMap() public phone?: string;
  @ApiPropertyOptional() @AutoMap() public gstin?: string;
  @ApiPropertyOptional() @AutoMap() public creditLimit?: number;
  @ApiProperty() @AutoMap() public creditBalance: number;
  @ApiPropertyOptional({ enum: ECustomerType }) @AutoMap(() => String) public customerType?: ECustomerType;
  @ApiPropertyOptional() @AutoMap() public discountPercent?: number | null;
  @ApiPropertyOptional() @AutoMap() public skipOverLimitApproval?: boolean | null;
  @ApiProperty() @AutoMap(() => Date) public createdAt: Date;
  @ApiPropertyOptional() @AutoMap(() => Date) public updatedAt?: Date;
  @ApiPropertyOptional({ enum: ['none', 'available', 'warning', 'over'] })
  public creditStatus?: string;
}
