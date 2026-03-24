import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import appConfig from './config/app.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StoresModule } from './modules/stores/stores.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { User } from './database/entities/user.entity';
import { RefreshToken } from './database/entities/refresh-token.entity';
import { Store } from './database/entities/store.entity';
import { Category } from './database/entities/category.entity';
import { Product } from './database/entities/product.entity';
import { ProductImage } from './database/entities/product-image.entity';
import { Color } from './database/entities/color.entity';
import { Dimension } from './database/entities/dimension.entity';
import { ProductVariant } from './database/entities/product-variant.entity';
import { Inventory } from './database/entities/inventory.entity';
import { InventoryTransaction } from './database/entities/inventory-transaction.entity';
import { StoreTransfer } from './database/entities/store-transfer.entity';
import { Order } from './database/entities/order.entity';
import { OrderItem } from './database/entities/order-item.entity';

@Module({
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(process.env.DATABASE_URL
        ? { url: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: process.env.DB_DATABASE || 'carpet_platform',
          }),
      entities: [User, RefreshToken, Store, Category, Product, ProductImage, Color, Dimension, ProductVariant, Inventory, InventoryTransaction, StoreTransfer, Order, OrderItem],
      synchronize: true,
      logging: false,
    }),
    AuthModule,
    UsersModule,
    StoresModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    ReportsModule,
    UploadsModule,
  ],
})
export class AppModule {}
