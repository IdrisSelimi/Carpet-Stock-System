import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
  ) {}

  async findAll(filters?: {
    search?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoin('p.variants', 'v')
      .leftJoin('v.color', 'c')
      .orderBy('p.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    if (filters?.search) {
      const tokens = filters.search.trim().split(/\s+/);
      tokens.forEach((token, i) => {
        const param = `tok${i}`;
        qb.andWhere(
          `(p.name ILIKE :${param} OR p.sku ILIKE :${param} OR c.name ILIKE :${param} OR c.colorCode ILIKE :${param})`,
          { [param]: `%${token}%` },
        );
      });
    }
    if (filters?.categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId: filters.categoryId });
    }
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      pagination: { page, limit, total_items: total, total_pages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, includeVariants = false): Promise<Product> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.images', 'img')
      .where('p.id = :id', { id });
    if (includeVariants) {
      qb.leftJoinAndSelect('p.variants', 'v')
        .leftJoinAndSelect('v.color', 'c')
        .leftJoinAndSelect('v.dimension', 'd');
    }
    const product = await qb.getOne();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const existing = await this.productRepo.findOne({ where: { sku: dto.sku } });
    if (existing) throw new ConflictException('Product SKU already exists');
    const product = this.productRepo.create({
      sku: dto.sku,
      name: dto.name,
      description: dto.description,
      categoryId: dto.category_id,
      brand: dto.brand,
      material: dto.material,
      isActive: dto.is_active ?? true,
    });
    return this.productRepo.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);
    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.productRepo.findOne({ where: { sku: dto.sku } });
      if (existing) throw new ConflictException('Product SKU already exists');
    }
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.category_id !== undefined) product.categoryId = dto.category_id;
    if (dto.brand !== undefined) product.brand = dto.brand;
    if (dto.material !== undefined) product.material = dto.material;
    if (dto.is_active !== undefined) product.isActive = dto.is_active;
    return this.productRepo.save(product);
  }

  async delete(id: string): Promise<void> {
    const product = await this.findById(id);
    await this.productRepo.remove(product);
  }
}
