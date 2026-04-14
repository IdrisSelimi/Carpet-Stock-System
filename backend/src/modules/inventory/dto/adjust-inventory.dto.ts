import { IsNumber, IsOptional, IsEnum, IsUUID, IsString } from 'class-validator';
import { TransactionType } from '../../../database/entities/inventory-transaction.entity';

export class AdjustInventoryDto {
  @IsNumber()
  quantity_change: number;

  @IsOptional()
  @IsEnum(TransactionType)
  transaction_type?: TransactionType;

  @IsOptional()
  @IsUUID()
  reference_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
