import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../database/entities/category.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { InventoryTransaction, TransactionType } from '../../database/entities/inventory-transaction.entity';
import { Store } from '../../database/entities/store.entity';
import { User, UserRole } from '../../database/entities/user.entity';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryTransaction)
    private transactionRepo: Repository<InventoryTransaction>,
    @InjectRepository(Store)
    private storeRepo: Repository<Store>,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {}

  async findAll(storeId?: string, lowStockOnly = false, search?: string) {
    const qb = this.inventoryRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.variant', 'v')
      .leftJoinAndSelect('v.product', 'p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('v.color', 'c')
      .leftJoinAndSelect('v.dimension', 'd')
      .leftJoinAndSelect('inv.store', 's')
      .orderBy('p.name')
      .addOrderBy('v.variantSku');
    if (storeId) qb.andWhere('inv.storeId = :storeId', { storeId });
    if (lowStockOnly) qb.andWhere('inv.quantity_available <= inv.reorder_level');
    if (search) {
      const tokens = search.trim().split(/\s+/);
      tokens.forEach((token, i) => {
        const param = `tok${i}`;
        const dimClause = /x/i.test(token) ? ` OR d.displayName ILIKE :${param}` : '';
        qb.andWhere(
          `(p.name ILIKE :${param} OR p.sku ILIKE :${param} OR s.name ILIKE :${param} OR s.code ILIKE :${param} OR c.name ILIKE :${param} OR c.colorCode ILIKE :${param} OR cat.name ILIKE :${param}${dimClause})`,
          { [param]: `%${token}%` },
        );
      });
    }
    const items = await qb.getMany();
    // TypeORM query builder does not hydrate p.category when nested 3 levels; attach categories manually
    const categoryIds = [...new Set(items.map((inv) => inv.variant?.product?.categoryId).filter(Boolean) as string[])];
    const categoryMap = new Map<string, Category>();
    if (categoryIds.length > 0) {
      const categories = await this.categoryRepo.find({ where: categoryIds.map((id) => ({ id })) });
      categories.forEach((cat) => categoryMap.set(cat.id, cat));
    }
    items.forEach((inv) => {
      (inv as unknown as { status?: string }).status =
        inv.reorderLevel > 0 && inv.quantityAvailable <= inv.reorderLevel
          ? 'LOW_STOCK'
          : inv.quantityAvailable === 0
            ? 'OUT_OF_STOCK'
            : 'OK';
      const product = inv.variant?.product;
      if (product?.categoryId && categoryMap.has(product.categoryId)) {
        (product as { category?: Category }).category = categoryMap.get(product.categoryId)!;
      }
    });
    return items;
  }

  async findByVariantId(variantId: string, storeId?: string) {
    const qb = this.inventoryRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.store', 's')
      .where('inv.variantId = :variantId', { variantId });
    if (storeId) qb.andWhere('inv.storeId = :storeId', { storeId });
    return qb.getMany();
  }

  async findById(id: string): Promise<Inventory> {
    const inv = await this.inventoryRepo.findOne({
      where: { id },
      relations: ['variant', 'variant.product', 'variant.color', 'variant.dimension', 'store'],
    });
    if (!inv) throw new NotFoundException('Inventory record not found');
    return inv;
  }

  async adjust(id: string, dto: AdjustInventoryDto, user: User) {
    const inv = await this.findById(id);
    if (user.role === UserRole.STORE_WORKER && inv.storeId !== user.storeId) {
      throw new ForbiddenException('You can only add or adjust stock for your own store');
    }
    const change = dto.quantity_change;
    if (change === 0) throw new BadRequestException('Quantity change cannot be zero');
    const newAvailable = inv.quantityAvailable + change;
    if (newAvailable < 0) throw new BadRequestException('Insufficient quantity');
    inv.quantityAvailable = newAvailable;
    if (change > 0) inv.lastRestockDate = new Date();
    await this.inventoryRepo.save(inv);
    const transaction = this.transactionRepo.create({
      variantId: inv.variantId,
      storeId: inv.storeId,
      transactionType: (dto.transaction_type as TransactionType) || TransactionType.ADJUSTMENT,
      quantity: change,
      referenceId: dto.reference_id,
      notes: dto.notes || '',
      performedById: user.id,
    });
    await this.transactionRepo.save(transaction);
    return { ...inv, transaction };
  }

  async getTransactions(filters: {
    variantId?: string;
    storeId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.performedBy', 'u')
      .leftJoinAndSelect('t.variant', 'v')
      .leftJoinAndSelect('v.product', 'p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('v.color', 'c')
      .leftJoinAndSelect('v.dimension', 'd')
      .leftJoinAndSelect('t.store', 's')
      .orderBy('t.createdAt', 'DESC')
      .take(filters.limit ?? 50);
    if (filters.variantId) qb.andWhere('t.variantId = :variantId', { variantId: filters.variantId });
    if (filters.storeId) qb.andWhere('t.storeId = :storeId', { storeId: filters.storeId });
    if (filters.startDate) qb.andWhere('t.createdAt >= :start', { start: filters.startDate });
    if (filters.endDate) qb.andWhere('t.createdAt <= :end', { end: filters.endDate });
    return qb.getMany();
  }

  async getLowStock(storeId?: string) {
    return this.findAll(storeId, true);
  }

  async delete(id: string): Promise<void> {
    const inv = await this.findById(id);
    await this.inventoryRepo.remove(inv);
  }

  /** Create inventory rows for this variant at all stores (for existing variants that had none). */
  async ensureVariantAtAllStores(variantId: string): Promise<Inventory[]> {
    const stores = await this.storeRepo.find({ where: { isActive: true } });
    const created: Inventory[] = [];
    for (const store of stores) {
      const existing = await this.inventoryRepo.findOne({ where: { variantId, storeId: store.id } });
      if (!existing) {
        const inv = await this.inventoryRepo.save(
          this.inventoryRepo.create({
            variantId,
            storeId: store.id,
            quantityAvailable: 0,
            quantityReserved: 0,
            reorderLevel: 0,
            reorderQuantity: 0,
          }),
        );
        created.push(inv);
      }
    }
    return created;
  }
}
