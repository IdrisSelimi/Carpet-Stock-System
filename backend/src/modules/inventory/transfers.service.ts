import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreTransfer, TransferStatus } from '../../database/entities/store-transfer.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { InventoryTransaction, TransactionType } from '../../database/entities/inventory-transaction.entity';
import { User } from '../../database/entities/user.entity';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(StoreTransfer)
    private transferRepo: Repository<StoreTransfer>,
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryTransaction)
    private transactionRepo: Repository<InventoryTransaction>,
  ) {}

  async create(dto: CreateTransferDto, user: User) {
    const fromInv = await this.inventoryRepo.findOne({
      where: { variantId: dto.variant_id, storeId: dto.from_store_id },
      relations: ['variant'],
    });
    if (!fromInv) throw new NotFoundException('Inventory not found at source store');
    if (fromInv.quantityAvailable < dto.quantity) {
      throw new BadRequestException('Insufficient quantity at source store');
    }
    fromInv.quantityAvailable -= dto.quantity;
    fromInv.quantityReserved += dto.quantity;
    await this.inventoryRepo.save(fromInv);
    const transfer = this.transferRepo.create({
      fromStoreId: dto.from_store_id,
      toStoreId: dto.to_store_id,
      variantId: dto.variant_id,
      quantity: dto.quantity,
      status: TransferStatus.PENDING,
      initiatedById: user.id,
      initiatedAt: new Date(),
      notes: dto.notes,
    });
    return this.transferRepo.save(transfer);
  }

  async findAll(storeId?: string) {
    const qb = this.transferRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.fromStore', 'fs')
      .leftJoinAndSelect('t.toStore', 'ts')
      .leftJoinAndSelect('t.variant', 'v')
      .leftJoinAndSelect('v.product', 'p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('v.color', 'c')
      .leftJoinAndSelect('v.dimension', 'd')
      .leftJoinAndSelect('t.initiatedBy', 'u')
      .orderBy('t.initiatedAt', 'DESC');
    if (storeId) {
      qb.andWhere('(t.fromStoreId = :storeId OR t.toStoreId = :storeId)', { storeId });
    }
    return qb.getMany();
  }

  async findById(id: string): Promise<StoreTransfer> {
    const t = await this.transferRepo.findOne({
      where: { id },
      relations: ['fromStore', 'toStore', 'variant', 'variant.product', 'initiatedBy', 'receivedBy'],
    });
    if (!t) throw new NotFoundException('Transfer not found');
    return t;
  }

  async confirm(id: string, user: User, notes?: string) {
    const transfer = await this.findById(id);
    if (transfer.status !== TransferStatus.PENDING && transfer.status !== TransferStatus.IN_TRANSIT) {
      throw new BadRequestException('Transfer already completed or cancelled');
    }
    const fromInv = await this.inventoryRepo.findOne({
      where: { variantId: transfer.variantId, storeId: transfer.fromStoreId },
    });
    const toInv = await this.inventoryRepo.findOne({
      where: { variantId: transfer.variantId, storeId: transfer.toStoreId },
    });
    if (!fromInv || !toInv) throw new NotFoundException('Inventory records not found');
    fromInv.quantityReserved -= transfer.quantity;
    toInv.quantityAvailable += transfer.quantity;
    toInv.lastRestockDate = new Date();
    await this.inventoryRepo.save([fromInv, toInv]);
    await this.transactionRepo.save([
      this.transactionRepo.create({
        variantId: transfer.variantId,
        storeId: transfer.fromStoreId,
        transactionType: TransactionType.TRANSFER,
        quantity: -transfer.quantity,
        referenceId: transfer.id,
        notes: notes || 'Transfer out',
        performedById: user.id,
      }),
      this.transactionRepo.create({
        variantId: transfer.variantId,
        storeId: transfer.toStoreId,
        transactionType: TransactionType.TRANSFER,
        quantity: transfer.quantity,
        referenceId: transfer.id,
        notes: notes || 'Transfer in',
        performedById: user.id,
      }),
    ]);
    transfer.status = TransferStatus.COMPLETED;
    transfer.receivedById = user.id;
    transfer.completedAt = new Date();
    if (notes) transfer.notes = (transfer.notes || '') + '\n' + notes;
    return this.transferRepo.save(transfer);
  }

  async directTransfer(dto: CreateTransferDto, user: User) {
    if (dto.from_store_id === dto.to_store_id) {
      throw new BadRequestException('Од и до продавницата мора да бидат различни');
    }
    const fromInv = await this.inventoryRepo.findOne({
      where: { variantId: dto.variant_id, storeId: dto.from_store_id },
    });
    if (!fromInv) throw new NotFoundException('Нема залиха за оваа варијанта во изворната продавница');
    if (fromInv.quantityAvailable < dto.quantity) {
      throw new BadRequestException(`Недоволна количина. Достапно: ${fromInv.quantityAvailable}`);
    }
    fromInv.quantityAvailable -= dto.quantity;
    await this.inventoryRepo.save(fromInv);

    let toInv = await this.inventoryRepo.findOne({
      where: { variantId: dto.variant_id, storeId: dto.to_store_id },
    });
    if (!toInv) {
      toInv = this.inventoryRepo.create({
        variantId: dto.variant_id,
        storeId: dto.to_store_id,
        quantityAvailable: dto.quantity,
        quantityReserved: 0,
        reorderLevel: 0,
        reorderQuantity: 0,
        lastRestockDate: new Date(),
      });
    } else {
      toInv.quantityAvailable += dto.quantity;
      toInv.lastRestockDate = new Date();
    }
    await this.inventoryRepo.save(toInv);

    const transfer = this.transferRepo.create({
      fromStoreId: dto.from_store_id,
      toStoreId: dto.to_store_id,
      variantId: dto.variant_id,
      quantity: dto.quantity,
      status: TransferStatus.COMPLETED,
      initiatedById: user.id,
      receivedById: user.id,
      initiatedAt: new Date(),
      completedAt: new Date(),
      notes: dto.notes,
    });
    await this.transferRepo.save(transfer);

    await this.transactionRepo.save([
      this.transactionRepo.create({
        variantId: dto.variant_id,
        storeId: dto.from_store_id,
        transactionType: TransactionType.TRANSFER,
        quantity: -dto.quantity,
        referenceId: transfer.id,
        notes: dto.notes || 'Трансфер - излез',
        performedById: user.id,
      }),
      this.transactionRepo.create({
        variantId: dto.variant_id,
        storeId: dto.to_store_id,
        transactionType: TransactionType.TRANSFER,
        quantity: dto.quantity,
        referenceId: transfer.id,
        notes: dto.notes || 'Трансфер - влез',
        performedById: user.id,
      }),
    ]);

    return transfer;
  }

  async cancel(id: string) {
    const transfer = await this.findById(id);
    if (transfer.status !== TransferStatus.PENDING && transfer.status !== TransferStatus.IN_TRANSIT) {
      throw new BadRequestException('Transfer cannot be cancelled');
    }
    const fromInv = await this.inventoryRepo.findOne({
      where: { variantId: transfer.variantId, storeId: transfer.fromStoreId },
    });
    if (fromInv) {
      fromInv.quantityAvailable += transfer.quantity;
      fromInv.quantityReserved -= transfer.quantity;
      await this.inventoryRepo.save(fromInv);
    }
    transfer.status = TransferStatus.CANCELLED;
    return this.transferRepo.save(transfer);
  }
}
