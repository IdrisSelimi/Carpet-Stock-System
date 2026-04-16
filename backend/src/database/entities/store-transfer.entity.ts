import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { ProductVariant } from './product-variant.entity';
import { User } from './user.entity';

export enum TransferStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('store_transfers')
export class StoreTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_store_id' })
  fromStoreId: string;

  @ManyToOne(() => Store, (s) => s.transfersFrom)
  @JoinColumn({ name: 'from_store_id' })
  fromStore: Store;

  @Column({ name: 'to_store_id' })
  toStoreId: string;

  @ManyToOne(() => Store, (s) => s.transfersTo)
  @JoinColumn({ name: 'to_store_id' })
  toStore: Store;

  @Column({ name: 'variant_id' })
  variantId: string;

  @ManyToOne(() => ProductVariant)
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column({ type: 'float', nullable: true })
  quantity: number;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.PENDING,
  })
  status: TransferStatus;

  @Column({ name: 'initiated_by' })
  initiatedById: string;

  @ManyToOne(() => User, (u) => u.initiatedTransfers)
  @JoinColumn({ name: 'initiated_by' })
  initiatedBy: User;

  @Column({ name: 'received_by', nullable: true })
  receivedById: string | null;

  @ManyToOne(() => User, (u) => u.receivedTransfers)
  @JoinColumn({ name: 'received_by' })
  receivedBy: User | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'initiated_at', type: 'timestamp' })
  initiatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
