import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, PaymentMethod } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { InventoryTransaction, TransactionType } from '../../database/entities/inventory-transaction.entity';
import { User } from '../../database/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryTransaction)
    private transactionRepo: Repository<InventoryTransaction>,
  ) {}

  private generateOrderNumber(): string {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORD-${y}${m}${d}-${r}`;
  }

  async findAll(
    storeId?: string,
    filters?: { status?: OrderStatus; search?: string; page?: number; limit?: number },
  ) {
    const limit = Math.min(filters?.limit ?? 50, 100);
    const page = filters?.page ?? 1;
    const skip = (page - 1) * limit;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.store', 's')
      .leftJoinAndSelect('o.createdBy', 'u')
      .leftJoinAndSelect('o.items', 'i')
      .leftJoinAndSelect('i.variant', 'v')
      .leftJoinAndSelect('v.product', 'p')
      .orderBy('o.createdAt', 'DESC');
    if (storeId) qb.andWhere('o.storeId = :storeId', { storeId });
    if (filters?.status) qb.andWhere('o.status = :status', { status: filters.status });
    if (filters?.search) {
      qb.andWhere('(o.orderNumber ILIKE :search OR o.customerName ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return {
      data: items,
      pagination: { page, limit, total_items: total, total_pages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['store', 'createdBy', 'items', 'items.variant', 'items.variant.product', 'items.variant.color', 'items.variant.dimension'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(dto: CreateOrderDto, user: User): Promise<Order> {
    let subtotal = 0;
    const items: Partial<OrderItem>[] = [];
    for (const row of dto.items) {
      const inv = await this.inventoryRepo.findOne({
        where: { variantId: row.variant_id, storeId: dto.store_id },
        relations: ['variant', 'variant.product'],
      });
      if (!inv) throw new BadRequestException(`Variant ${row.variant_id} not in store`);
      if (inv.quantityAvailable < row.quantity) {
        throw new BadRequestException(`Insufficient stock for variant ${row.variant_id}`);
      }
      const unitPrice = Number(row.unit_price);
      const itemSubtotal = unitPrice * row.quantity;
      subtotal += itemSubtotal;
      items.push({
        variantId: row.variant_id,
        quantity: row.quantity,
        unitPrice: String(unitPrice),
        subtotal: String(itemSubtotal),
      });
    }
    const taxRate = 0.09;
    const taxAmount = subtotal * taxRate;
    const discountAmount = dto.discount_amount ?? 0;
    const totalAmount = subtotal + taxAmount - discountAmount;
    const orderNumber = this.generateOrderNumber();
    const order = this.orderRepo.create({
      orderNumber,
      storeId: dto.store_id,
      customerName: dto.customer_name ?? 'Walk-in',
      customerPhone: dto.customer_phone,
      customerEmail: dto.customer_email,
      subtotal: String(subtotal),
      taxAmount: String(taxAmount),
      discountAmount: String(discountAmount),
      totalAmount: String(totalAmount),
      status: OrderStatus.COMPLETED,
      paymentMethod: (dto.payment_method as PaymentMethod) || PaymentMethod.CASH,
      createdById: user.id,
    });
    const savedOrder = await this.orderRepo.save(order);
    for (let i = 0; i < items.length; i++) {
      const item = this.orderItemRepo.create({ ...items[i], orderId: savedOrder.id });
      await this.orderItemRepo.save(item);
      const inv = await this.inventoryRepo.findOne({
        where: { variantId: dto.items[i].variant_id, storeId: dto.store_id },
      });
      if (inv) {
        inv.quantityAvailable -= dto.items[i].quantity;
        await this.inventoryRepo.save(inv);
        await this.transactionRepo.save(
          this.transactionRepo.create({
            variantId: dto.items[i].variant_id,
            storeId: dto.store_id,
            transactionType: TransactionType.STOCK_OUT,
            quantity: -dto.items[i].quantity,
            referenceId: savedOrder.id,
            notes: `Order ${orderNumber}`,
            performedById: user.id,
          }),
        );
      }
    }
    return this.findById(savedOrder.id);
  }

  async update(id: string, dto: UpdateOrderDto): Promise<Order> {
    const order = await this.findById(id);
    if (dto.status !== undefined) order.status = dto.status as OrderStatus;
    return this.orderRepo.save(order);
  }

  async cancel(id: string): Promise<Order> {
    const order = await this.findById(id);
    if (order.status === OrderStatus.CANCELLED) throw new BadRequestException('Order already cancelled');
    order.status = OrderStatus.CANCELLED;
    for (const item of order.items) {
      const inv = await this.inventoryRepo.findOne({
        where: { variantId: item.variantId, storeId: order.storeId },
      });
      if (inv) {
        inv.quantityAvailable += item.quantity;
        await this.inventoryRepo.save(inv);
      }
    }
    return this.orderRepo.save(order);
  }
}
