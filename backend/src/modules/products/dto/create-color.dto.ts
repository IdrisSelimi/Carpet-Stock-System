import { IsString, IsOptional } from 'class-validator';

export class CreateColorDto {
  @IsString()
  name: string;

  @IsString()
  color_code: string;

  @IsOptional()
  @IsString()
  hex_value?: string;
}
