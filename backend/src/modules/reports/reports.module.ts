import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from '../../database/entities/inventory.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
