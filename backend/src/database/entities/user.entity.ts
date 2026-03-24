import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Store } from './store.entity';
import { RefreshToken } from './refresh-token.entity';
import { InventoryTransaction } from './inventory-transaction.entity';
import { Order } from './order.entity';
import { StoreTransfer } from './store-transfer.entity';

export enum UserRole {
  MANAGER = 'MANAGER',
  STORE_WORKER = 'STORE_WORKER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ name: 'store_id', nullable: true })
  storeId: string | null;

  @ManyToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'store_id' })
  store: Store | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => InventoryTransaction, (t) => t.performedBy)
  inventoryTransactions: InventoryTransaction[];

  @OneToMany(() => Order, (o) => o.createdBy)
  orders: Order[];

  @OneToMany(() => StoreTransfer, (t) => t.initiatedBy)
  initiatedTransfers: StoreTransfer[];

  @OneToMany(() => StoreTransfer, (t) => t.receivedBy)
  receivedTransfers: StoreTransfer[];
}
