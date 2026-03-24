import { IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpdateVariantDto {
  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
