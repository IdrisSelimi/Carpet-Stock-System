import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { Color } from './color.entity';
import { Dimension } from './dimension.entity';
import { Inventory } from './inventory.entity';

@Entity('product_variants')
@Unique(['productId', 'colorId', 'dimensionId'])
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, (p) => p.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'color_id' })
  colorId: string;

  @ManyToOne(() => Color, (c) => c.variants)
  @JoinColumn({ name: 'color_id' })
  color: Color;

  @Column({ name: 'dimension_id' })
  dimensionId: string;

  @ManyToOne(() => Dimension, (d) => d.variants)
  @JoinColumn({ name: 'dimension_id' })
  dimension: Dimension;

  @Column({ name: 'variant_sku' })
  variantSku: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Inventory, (inv) => inv.variant)
  inventory: Inventory[];
}
