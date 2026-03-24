import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Inventory } from './inventory.entity';
import { Order } from './order.entity';
import { StoreTransfer } from './store-transfer.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ name: 'state_province', nullable: true })
  stateProvince: string;

  @Column({ name: 'postal_code', nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.store)
  users: User[];

  @OneToMany(() => Inventory, (inv) => inv.store)
  inventory: Inventory[];

  @OneToMany(() => Order, (order) => order.store)
  orders: Order[];

  @OneToMany(() => StoreTransfer, (t) => t.fromStore)
  transfersFrom: StoreTransfer[];

  @OneToMany(() => StoreTransfer, (t) => t.toStore)
  transfersTo: StoreTransfer[];
}
