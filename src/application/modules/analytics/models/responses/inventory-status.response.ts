import { ApiProperty } from '@nestjs/swagger';

export class InventoryStatusResponse {
  @ApiProperty() public normal: number;
  @ApiProperty() public low: number;
  @ApiProperty() public out: number;
  @ApiProperty() public over: number;
  @ApiProperty() public dead: number;
}
