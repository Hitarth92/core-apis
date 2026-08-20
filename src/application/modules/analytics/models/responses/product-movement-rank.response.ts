import { ApiProperty } from '@nestjs/swagger';

export class ProductMovementRankResponse {
  @ApiProperty() public productId: string;
  @ApiProperty() public productName: string;
  @ApiProperty() public quantity: number;
  @ApiProperty() public value: number;
}
