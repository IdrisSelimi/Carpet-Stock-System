import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductImage } from '../../database/entities/product-image.entity';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(ProductImage)
    private productImageRepo: Repository<ProductImage>,
  ) {}

  async saveProductImage(
    productId: string,
    imageUrl: string,
    options?: { altText?: string; displayOrder?: number; isPrimary?: boolean },
  ): Promise<ProductImage> {
    const img = this.productImageRepo.create({
      productId,
      imageUrl,
      altText: options?.altText,
      displayOrder: options?.displayOrder ?? 0,
      isPrimary: options?.isPrimary ?? false,
    });
    return this.productImageRepo.save(img);
  }
}
