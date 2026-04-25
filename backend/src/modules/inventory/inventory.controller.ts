import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { TransfersService } from './transfers.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';

@Controller('inventory')
@UseGuards(JwtAuthGuard, StoreAccessGuard)
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private transfersService: TransfersService,
  ) {}

  @Get()
  async list(
    @Query('store_id') storeId: string,
    @Query('low_stock') lowStock: string,
    @Query('search') search: string,
  ) {
    return this.inventoryService.findAll(storeId ?? undefined, lowStock === 'true', search?.trim() || undefined);
  }

  @Get('low-stock')
  async lowStock(@Query('store_id') storeId: string) {
    return this.inventoryService.getLowStock(storeId);
  }

  @Get('transactions')
  async transactions(
    @Query('variant_id') variantId: string,
    @Query('store_id') storeId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('limit') limit: number,
  ) {
    return this.inventoryService.getTransactions({
      variantId,
      storeId,
      startDate,
      endDate,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('variant/:id')
  async byVariant(@Param('id') variantId: string, @Query('store_id') storeId: string) {
    return this.inventoryService.findByVariantId(variantId, storeId);
  }

  @Post('initialize-variant/:variantId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async initializeVariant(@Param('variantId') variantId: string) {
    const created = await this.inventoryService.ensureVariantAtAllStores(variantId);
    return { message: `Created ${created.length} inventory record(s) for variant`, created: created.length };
  }

  @Get('transfers')
  async listTransfers(@Query('store_id') storeId: string) {
    return this.transfersService.findAll(storeId);
  }

  @Post('transfers')
  async createTransfer(@Body() dto: CreateTransferDto, @CurrentUser() user: User) {
    return this.transfersService.create(dto, user);
  }

  @Post('transfers/direct')
  async directTransfer(@Body() dto: CreateTransferDto, @CurrentUser() user: User) {
    return this.transfersService.directTransfer(dto, user);
  }

  @Get('transfers/:id')
  async getTransfer(@Param('id') id: string) {
    return this.transfersService.findById(id);
  }

  @Put('transfers/:id/confirm')
  async confirmTransfer(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @CurrentUser() user: User,
  ) {
    return this.transfersService.confirm(id, user, notes);
  }

  @Put('transfers/:id/cancel')
  async cancelTransfer(@Param('id') id: string) {
    return this.transfersService.cancel(id);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.inventoryService.findById(id);
  }

  @Put(':id/adjust')
  async adjust(
    @Param('id') id: string,
    @Body() dto: AdjustInventoryDto,
    @CurrentUser() user: User,
  ) {
    return this.inventoryService.adjust(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async delete(@Param('id') id: string) {
    await this.inventoryService.delete(id);
    return { message: 'Inventory record deleted' };
  }
}
