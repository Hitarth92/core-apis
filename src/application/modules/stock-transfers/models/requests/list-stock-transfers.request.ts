import { AutoMap } from '@automapper/classes';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EOrder, Filter } from '../../../../../common';
import { StockTransferFilter } from '../../i-stock-transfer.repo';

export class ListStockTransfersRequest implements Filter<StockTransferFilter> {
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public fromLocationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public toLocationId?: string;
  @ApiPropertyOptional({ description: 'Search by transfer number' }) @IsOptional() @IsString() @AutoMap() public search?: string;

  @ApiPropertyOptional() @IsOptional() @IsString({ each: true }) @AutoMap(() => Array) public $ids?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public $orderBy?: string;
  @ApiPropertyOptional({ enum: EOrder }) @IsOptional() @IsEnum(EOrder) @AutoMap(() => String) public $order?: EOrder;
}
