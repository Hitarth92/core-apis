import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryResponse {
  @ApiProperty() @AutoMap() public id: string;
  @ApiProperty() @AutoMap() public organizationId: string;
  @ApiProperty() @AutoMap() public locationId: string;
  @ApiProperty() @AutoMap() public productId: string;
  @ApiProperty() @AutoMap() public quantityOnHand: number;
  @ApiProperty() @AutoMap() public quantityReserved: number;
  @ApiProperty({ description: 'Black / unpublished pool quantity at this location' })
  @AutoMap()
  public quantityUnpublished: number;
  @ApiProperty() @AutoMap() public reorderLevel: number;
  @ApiPropertyOptional() @AutoMap() public maxStock?: number;
  @ApiPropertyOptional() @AutoMap() public averageCost?: number;
  @ApiPropertyOptional() @AutoMap() public binLocation?: string;
  @ApiPropertyOptional() @AutoMap(() => Date) public createdAt?: Date;
  @ApiPropertyOptional() @AutoMap(() => Date) public updatedAt?: Date;
}

export class InventorysPagedResponse {
  @ApiProperty({ type: [InventoryResponse] }) public items: InventoryResponse[];
  @ApiProperty() public page: number;
  @ApiProperty() public perPage: number;
  @ApiProperty() public totalCount: number;
  @ApiProperty() public totalPages: number;
}
