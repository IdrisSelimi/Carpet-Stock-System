import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from '../../database/entities/inventory.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
  ) {}

  async inventorySummary(storeId: string | undefined) {
    const qb = this.inventoryRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.variant', 'v')
      .leftJoinAndSelect('v.product', 'p')
      .leftJoinAndSelect('inv.store', 's');
    if (storeId) qb.andWhere('inv.storeId = :storeId', { storeId });
    const items = await qb.getMany();
    let lowStockCount = 0;
    let outOfStockCount = 0;
    for (const inv of items) {
      if (inv.reorderLevel > 0 && inv.quantityAvailable <= inv.reorderLevel) lowStockCount++;
      if (inv.quantityAvailable === 0) outOfStockCount++;
    }
    return {
      report_type: 'inventory_summary',
      summary: {
        total_records: items.length,
        total_quantity: items.reduce((s, i) => s + i.quantityAvailable, 0),
        low_stock_items: lowStockCount,
        out_of_stock_items: outOfStockCount,
      },
    };
  }

  async lowStockReport(storeId: string | undefined) {
    const qb = this.inventoryRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.variant', 'v')
      .leftJoinAndSelect('v.product', 'p')
      .leftJoinAndSelect('inv.store', 's')
      .andWhere('inv.quantity_available <= inv.reorder_level');
    if (storeId) qb.andWhere('inv.storeId = :storeId', { storeId });
    return qb.getMany();
  }
}
