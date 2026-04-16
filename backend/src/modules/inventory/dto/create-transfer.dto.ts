import { IsUUID, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransferDto {
  @IsUUID()
  from_store_id: string;

  @IsUUID()
  to_store_id: string;

  @IsUUID()
  variant_id: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
