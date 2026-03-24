import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StoreAccessGuard } from '../../common/guards/store-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, StoreAccessGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('inventory-summary')
  async inventorySummary(@Query('store_id') storeId: string, @CurrentUser() user: User) {
    const effectiveStoreId = user.role === UserRole.STORE_WORKER ? user.storeId : storeId;
    return this.reportsService.inventorySummary(effectiveStoreId ?? undefined);
  }

  @Get('low-stock')
  async lowStock(@Query('store_id') storeId: string, @CurrentUser() user: User) {
    const effectiveStoreId = user.role === UserRole.STORE_WORKER ? user.storeId : storeId;
    return this.reportsService.lowStockReport(effectiveStoreId ?? undefined);
  }
}
