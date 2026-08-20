import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EStockTransferRequestStatus } from '../../../../shared/enums/e-stock-transfer-request-status';

export class StockTransferRequestResponse {
  @ApiProperty() @AutoMap() public id: string;
  @ApiProperty() @AutoMap() public organizationId: string;
  @ApiProperty() @AutoMap() public requestingLocationId: string;
  @ApiPropertyOptional() @AutoMap() public requestingUserId?: string;
  @ApiProperty() @AutoMap() public productId: string;
  @ApiPropertyOptional() @AutoMap() public variantId?: string;
  @ApiProperty() @AutoMap() public quantityRequested: number;
  @ApiProperty({ enum: EStockTransferRequestStatus }) @AutoMap(() => String) public status: EStockTransferRequestStatus;
  @ApiPropertyOptional() @AutoMap() public acceptedByLocationId?: string;
  @ApiPropertyOptional() @AutoMap() public acceptedByUserId?: string;
  @ApiPropertyOptional() @AutoMap(() => Date) public acceptedAt?: Date;
  @ApiPropertyOptional() @AutoMap(() => Date) public claimedAt?: Date;
  @ApiPropertyOptional() @AutoMap() public cancelledByUserId?: string;
  @ApiPropertyOptional() @AutoMap(() => Date) public cancelledAt?: Date;
  @ApiPropertyOptional() @AutoMap() public fulfillmentTransferId?: string;
  @ApiPropertyOptional() public canFulfill?: boolean;
  @ApiPropertyOptional() public availableStock?: number;
  @ApiProperty() @AutoMap(() => Date) public createdAt: Date;
  @ApiPropertyOptional() @AutoMap(() => Date) public updatedAt?: Date;
}
