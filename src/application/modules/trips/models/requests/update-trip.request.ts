import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AutoMap } from '@automapper/classes';
import { ETripStatus } from '../../../../shared/enums/e-trip-status';

export class UpdateTripRequest {
  @ApiPropertyOptional()
  @AutoMap()
  @IsOptional()
  @IsEnum(ETripStatus)
  public tripStatus?: ETripStatus;

  @ApiPropertyOptional()
  @AutoMap()
  @IsOptional()
  @IsString()
  public remarks?: string;
}
