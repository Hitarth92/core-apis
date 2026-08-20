import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCreditTransactionRequest {
  @ApiProperty({ enum: ['payment', 'adjustment'] })
  @IsIn(['payment', 'adjustment'])
  public type: 'payment' | 'adjustment';

  @ApiProperty({ description: 'Positive number for payment; signed number for adjustment' })
  @IsNumber()
  public amount: number;

  @ApiPropertyOptional({ enum: ['cash', 'bank_transfer', 'cheque', 'other'] })
  @IsOptional()
  @IsString()
  public paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public note?: string;
}
