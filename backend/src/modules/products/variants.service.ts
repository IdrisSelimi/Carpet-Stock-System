import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { ProductVariant } from '../../database/entities/product-variant.entity';
import { Product } from '../../database/entities/product.entity';
import { Color } from '../../database/entities/color.entity';
import { Dimension } from '../../database/entities/dimension.entity';
import { Store } from '../../database/entities/store.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class VariantsService {
  private readonly logger = new Logger(VariantsService.name);

  constructor(
    @InjectRepository(ProductVariant)
    private variantRepo: Repository<ProductVariant>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Color)
    private colorRepo: Repository<Color>,
    @InjectRepository(Dimension)
    private dimensionRepo: Repository<Dimension>,
    @InjectRepository(Store)
    private storeRepo: Repository<Store>,
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
    private dataSource: DataSource,
  ) {}

  async findByProductId(productId: string) {
    return this.variantRepo.find({
      where: { productId },
      relations: ['color', 'dimension'],
      order: { variantSku: 'ASC' },
    });
  }

  async findById(id: string): Promise<ProductVariant> {
    const v = await this.variantRepo.findOne({
      where: { id },
      relations: ['product', 'color', 'dimension'],
    });
    if (!v) throw new NotFoundException('Variant not found');
    return v;
  }

  private generateVariantSku(productSku: string, colorCode: string, displayName: string): string {
    const dimPart = displayName.replace(/\s/g, '').replace(/x/gi, 'X');
    return `${productSku}-${colorCode}-${dimPart}`.toUpperCase();
  }

  async create(productId: string, dto: CreateVariantDto): Promise<ProductVariant> {
    try {
      return await this.createVariant(productId, dto);
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ConflictException) throw err;
      this.logger.error('Variant create failed', err);
      throw err;
    }
  }

  private async createVariant(productId: string, dto: CreateVariantDto): Promise<ProductVariant> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['category'],
    });
    if (!product) throw new NotFoundException('Product not found');

    let color: Color;
    if (dto.color_name?.trim()) {
      const name = dto.color_name.trim();
      const found = await this.colorRepo
        .createQueryBuilder('c')
        .where('LOWER(c.name) = LOWER(:name)', { name })
        .getOne();
      if (!found) {
        const baseCode = name.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/gi, '') || `COLOR-${Date.now()}`;
        let finalCode = baseCode;
        const existingCode = await this.colorRepo.findOne({ where: { colorCode: baseCode } });
        if (existingCode) finalCode = `${baseCode}-${Date.now().toString(36)}`;
        color = this.colorRepo.create({ name, colorCode: finalCode });
        try {
          color = await this.colorRepo.save(color);
        } catch (err) {
          if (err instanceof QueryFailedError && (err as QueryFailedError & { code?: string }).code === '23505') {
            finalCode = `${baseCode}-${Date.now().toString(36)}`;
            color = this.colorRepo.create({ name, colorCode: finalCode });
            color = await this.colorRepo.save(color);
          } else {
            throw err;
          }
        }
      } else {
        color = found;
      }
    } else if (dto.color_id) {
      const foundColor = await this.colorRepo.findOne({ where: { id: dto.color_id } });
      if (!foundColor) throw new NotFoundException('Color not found');
      color = foundColor;
    } else {
      throw new NotFoundException('Provide either color_id or color_name');
    }

    const dimension = await this.dimensionRepo.findOne({ where: { id: dto.dimension_id } });
    if (!dimension) throw new NotFoundException('Dimension not found');
    const displayName = dimension.displayName || `${dimension.width}x${dimension.length}`;
    const colorCode = color.colorCode;
    const variantSku = this.generateVariantSku(product.sku, colorCode, displayName);
    const existingByCombo = await this.variantRepo.findOne({
      where: { productId, colorId: color.id, dimensionId: dto.dimension_id },
      relations: ['color', 'dimension'],
    });
    if (existingByCombo) {
      const existingColorName = existingByCombo.color?.name ?? 'unknown';
      const existingDim = existingByCombo.dimension?.displayName ?? 'unknown';
      throw new ConflictException(
        `A variant with this color and dimension already exists. Existing: SKU ${existingByCombo.variantSku}, Color: "${existingColorName}", Dimension: ${existingDim}. If you don't see it in the list, refresh the page.`,
      );
    }
    const existingBySku = await this.variantRepo.findOne({
      where: { variantSku, productId },
      relations: ['color', 'dimension'],
    });
    if (existingBySku) {
      const existingColorName = existingBySku.color?.name ?? 'unknown';
      throw new ConflictException(
        `A variant with SKU "${existingBySku.variantSku}" already exists (Color: "${existingColorName}"). Same product + size was used with a color that matches this code. Check the list above or refresh.`,
      );
    }
    const stores = await this.storeRepo.find({ where: { isActive: true } });

    let saved: ProductVariant;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        const variant = manager.create(ProductVariant, {
          productId,
          colorId: color.id,
          dimensionId: dto.dimension_id,
          variantSku,
          weight: dto.weight != null ? String(dto.weight) : undefined,
          isActive: dto.is_active ?? true,
        });
        const savedVariant = await manager.save(ProductVariant, variant);

        for (const store of stores) {
          await manager.save(
            Inventory,
            manager.create(Inventory, {
              variantId: savedVariant.id,
              storeId: store.id,
              quantityAvailable: 0,
              quantityReserved: 0,
              reorderLevel: 0,
              reorderQuantity: 0,
            }),
          );
        }
        return savedVariant;
      });
    } catch (err) {
      if (err instanceof QueryFailedError && (err as QueryFailedError & { code?: string }).code === '23505') {
        throw new ConflictException('A variant with this color and dimension already exists for this product');
      }
      this.logger.error('Variant create transaction failed', err);
      throw err;
    }
    return saved;
  }

  async update(id: string, dto: UpdateVariantDto): Promise<ProductVariant> {
    const variant = await this.findById(id);
    if (dto.weight !== undefined) variant.weight = String(dto.weight);
    if (dto.is_active !== undefined) variant.isActive = dto.is_active;
    return this.variantRepo.save(variant);
  }

  async delete(id: string): Promise<void> {
    const v = await this.findById(id);
    await this.variantRepo.remove(v);
  }
}
