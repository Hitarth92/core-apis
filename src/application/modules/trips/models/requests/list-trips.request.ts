import { AutoMap } from '@automapper/classes';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { EOrder, Filter } from 'src/common';
import { Trip } from '../../domain';

export class ListTripsRequest implements Filter<Trip, string> {
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public tripNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsString({ each: true }) @AutoMap(() => Array) public $ids?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public $orderBy?: string;

  @ApiPropertyOptional({ enum: EOrder }) @IsOptional() @IsEnum(EOrder) @AutoMap(() => String) public $order?: EOrder;
}
