import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class RaiseStockTransferRequestRequest {
  @ApiProperty() @IsNotEmpty() @IsUUID() @AutoMap() public requestingLocationId: string;
  @ApiProperty() @IsNotEmpty() @IsUUID() @AutoMap() public productId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() @AutoMap() public variantId?: string;
  @ApiProperty() @IsNotEmpty() @IsNumber() @IsPositive() @AutoMap() public quantityRequested: number;
}
