import { ApiProperty } from '@nestjs/swagger';

export class SupplierPricePointResponse {
  @ApiProperty() public productId: string;
  @ApiProperty() public productName: string;
  @ApiProperty() public supplierId: string;
  @ApiProperty() public supplierName: string;
  @ApiProperty() public avgUnitCost: number;
}
