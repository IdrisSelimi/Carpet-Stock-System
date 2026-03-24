import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductImage } from '../../database/entities/product-image.entity';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductImage])],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
