import { IsUUID, IsOptional, IsNumber, IsBoolean, IsString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';


export class CreateVariantDto {
  @ValidateIf((o) => !o.color_name)
  @IsUUID()
  color_id?: string;

  @ValidateIf((o) => !o.color_id)
  @IsString()
  color_name?: string;

  @IsUUID()
  dimension_id: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
