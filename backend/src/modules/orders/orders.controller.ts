import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';
import { OrderStatus } from '../../database/entities/order.entity';

@Controller('orders')
@UseGuards(JwtAuthGuard, StoreAccessGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  async list(
    @Query('store_id') storeId: string,
    @Query('status') status: OrderStatus,
    @Query('search') search: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @CurrentUser() user: User,
  ) {
    const effectiveStoreId = user.role === UserRole.STORE_WORKER ? user.storeId : storeId;
    return this.ordersService.findAll(effectiveStoreId ?? undefined, {
      status,
      search: search?.trim() || undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateOrderDto, @CurrentUser() user: User) {
    return this.ordersService.create(dto, user);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string) {
    return this.ordersService.cancel(id);
  }
}
