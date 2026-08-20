import { ApiProperty } from '@nestjs/swagger';

export class DemandTierPointResponse {
  @ApiProperty({ enum: ['High', 'Medium', 'Low'] }) public tier: string;
  @ApiProperty() public count: number;
}
