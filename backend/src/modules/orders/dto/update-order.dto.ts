import { IsOptional, IsEnum } from 'class-validator';
import { OrderStatus } from '../../../database/entities/order.entity';

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
