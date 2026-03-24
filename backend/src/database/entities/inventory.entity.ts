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
import { ProductVariant } from './product-variant.entity';
import { Store } from './store.entity';

@Entity('inventory')
@Unique(['variantId', 'storeId'])
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'variant_id' })
  variantId: string;

  @ManyToOne(() => ProductVariant, (v) => v.inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, (s) => s.inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'quantity_available', default: 0 })
  quantityAvailable: number;

  @Column({ name: 'quantity_reserved', default: 0 })
  quantityReserved: number;

  @Column({ name: 'reorder_level', default: 0 })
  reorderLevel: number;

  @Column({ name: 'reorder_quantity', default: 0 })
  reorderQuantity: number;

  @Column({ name: 'last_restock_date', type: 'timestamp', nullable: true })
  lastRestockDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
