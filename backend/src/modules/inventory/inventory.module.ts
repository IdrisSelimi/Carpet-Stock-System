import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../../database/entities/category.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { InventoryTransaction } from '../../database/entities/inventory-transaction.entity';
import { StoreTransfer } from '../../database/entities/store-transfer.entity';
import { Store } from '../../database/entities/store.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { TransfersService } from './transfers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, InventoryTransaction, StoreTransfer, Store, Category]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, TransfersService],
  exports: [InventoryService, TransfersService],
})
export class InventoryModule {}
