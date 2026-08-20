import { ApiProperty } from '@nestjs/swagger';
import { ProductMovementRankResponse } from './product-movement-rank.response';

export class StockDamageSummaryResponse {
  @ApiProperty() public totalUnits: number;
  @ApiProperty() public eventCount: number;
  @ApiProperty({ type: [ProductMovementRankResponse] }) public topProducts: ProductMovementRankResponse[];
}
