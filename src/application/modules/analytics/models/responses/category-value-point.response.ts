import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryValuePointResponse {
  @ApiPropertyOptional() public categoryId?: string;
  @ApiProperty() public categoryName: string;
  @ApiProperty() public value: number;
}
