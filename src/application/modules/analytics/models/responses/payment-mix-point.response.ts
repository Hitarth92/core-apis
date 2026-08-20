import { ApiProperty } from '@nestjs/swagger';

export class PaymentMixPointResponse {
  @ApiProperty() public method: string;
  @ApiProperty() public amount: number;
}
