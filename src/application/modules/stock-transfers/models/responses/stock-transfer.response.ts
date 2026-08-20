import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

export class StockTransferResponse {
  @ApiProperty() @AutoMap() public id: string;
  @ApiProperty() @AutoMap() public organizationId: string;
  @ApiProperty() @AutoMap() public fromLocationId: string;
  @ApiProperty() @AutoMap() public toLocationId: string;
  @ApiProperty() @AutoMap() public transferNumber: string;
  @ApiProperty() @AutoMap() public status: string;
}

export class StockTransfersPagedResponse {
  @ApiProperty({ type: [StockTransferResponse] }) public items: StockTransferResponse[];
  @ApiProperty() public page: number;
  @ApiProperty() public perPage: number;
  @ApiProperty() public totalCount: number;
  @ApiProperty() public totalPages: number;
}
