import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerCreditTransactionResponse {
  @ApiProperty() @AutoMap() public id: string;
  @ApiProperty() @AutoMap() public customerId: string;
  @ApiPropertyOptional() @AutoMap() public billId?: string;
  @ApiProperty() @AutoMap(() => String) public type: string;
  @ApiProperty() @AutoMap() public amount: number;
  @ApiProperty() @AutoMap() public balanceBefore: number;
  @ApiProperty() @AutoMap() public balanceAfter: number;
  @ApiPropertyOptional() @AutoMap() public paymentMethod?: string;
  @ApiPropertyOptional() @AutoMap() public note?: string;
  @ApiPropertyOptional() @AutoMap() public performedById?: string;
  @ApiProperty() @AutoMap(() => Date) public createdAt: Date;
}
