import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../database/entities/product.entity';
import { ProductImage } from '../../database/entities/product-image.entity';
import { ProductVariant } from '../../database/entities/product-variant.entity';
import { Color } from '../../database/entities/color.entity';
import { Dimension } from '../../database/entities/dimension.entity';
import { Store } from '../../database/entities/store.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ColorsService } from './colors.service';
import { DimensionsService } from './dimensions.service';
import { VariantsService } from './variants.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, ProductVariant, Color, Dimension, Store, Inventory]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ColorsService, DimensionsService, VariantsService],
  exports: [ProductsService, ColorsService, DimensionsService, VariantsService],
})
export class ProductsModule {}
