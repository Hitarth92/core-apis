import { ApiProperty } from '@nestjs/swagger';

export class PurchaseExceptionsResponse {
  @ApiProperty() public pending: number;
  @ApiProperty() public approvalPending: number;
  @ApiProperty() public priceIncreased: number;
}
