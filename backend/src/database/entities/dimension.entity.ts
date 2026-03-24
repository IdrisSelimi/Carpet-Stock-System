import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { ProductVariant } from './product-variant.entity';

export enum DimensionUnit {
  METERS = 'METERS',
  FEET = 'FEET',
}

@Entity('dimensions')
export class Dimension {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  width: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  length: string;

  @Column({
    type: 'enum',
    enum: DimensionUnit,
  })
  unit: DimensionUnit;

  @Column({ name: 'display_name' })
  displayName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => ProductVariant, (v) => v.dimension)
  variants: ProductVariant[];
}
