import { ApiProperty } from '@nestjs/swagger';

export class ProductMarginRankResponse {
  @ApiProperty() public productId: string;
  @ApiProperty() public productName: string;
  @ApiProperty() public totalMargin: number;
  @ApiProperty() public totalRevenue: number;
  @ApiProperty() public avgUnitPrice: number;
}
