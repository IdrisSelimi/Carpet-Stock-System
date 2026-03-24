import { IsString, IsNumber, IsEnum } from 'class-validator';
import { DimensionUnit } from '../../../database/entities/dimension.entity';

export class CreateDimensionDto {
  @IsNumber()
  width: number;

  @IsNumber()
  length: number;

  @IsEnum(DimensionUnit)
  unit: DimensionUnit;

  @IsString()
  display_name: string;
}
