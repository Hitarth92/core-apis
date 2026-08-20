import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateQuickChargeRequest {
  @ApiProperty() @IsNotEmpty() @IsString() @AutoMap() public label: string;
  @ApiProperty() @IsNotEmpty() @IsNumber() @AutoMap() public amount: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @AutoMap() public enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @AutoMap() public sortOrder?: number;
}
