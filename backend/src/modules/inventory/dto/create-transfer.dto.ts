import { IsUUID, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransferDto {
  @IsUUID()
  from_store_id: string;

  @IsUUID()
  to_store_id: string;

  @IsUUID()
  variant_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
