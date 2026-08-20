import { AutoMap } from '@automapper/classes';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PageableFilter } from '../../../../../common';
import { StockTransferFilter } from '../../i-stock-transfer.repo';
import { ListStockTransfersRequest } from './list-stock-transfers.request';

export class SearchStockTransfersRequest extends ListStockTransfersRequest implements PageableFilter<StockTransferFilter> {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @AutoMap() public $page?: number = 1;
  @ApiPropertyOptional({ default: 15 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @AutoMap() public $perPage?: number = 15;
}
