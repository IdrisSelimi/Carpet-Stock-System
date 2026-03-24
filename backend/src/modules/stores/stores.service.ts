import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../../database/entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private storeRepo: Repository<Store>,
  ) {}

  async findAll(activeOnly = false, search?: string): Promise<Store[]> {
    const qb = this.storeRepo.createQueryBuilder('store').orderBy('store.name');
    if (activeOnly) qb.andWhere('store.isActive = :v', { v: true });
    if (search) {
      qb.andWhere(
        '(store.name ILIKE :search OR store.code ILIKE :search OR store.city ILIKE :search OR store.country ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    return qb.getMany();
  }

  async findById(id: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async create(dto: CreateStoreDto): Promise<Store> {
    const existing = await this.storeRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Store code already exists');
    const store = this.storeRepo.create({
      name: dto.name,
      code: dto.code,
      address: dto.address,
      city: dto.city,
      stateProvince: dto.state_province,
      postalCode: dto.postal_code,
      country: dto.country,
      phone: dto.phone,
      email: dto.email,
      isActive: dto.is_active ?? true,
    });
    return this.storeRepo.save(store);
  }

  async update(id: string, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.findById(id);
    if (dto.code && dto.code !== store.code) {
      const existing = await this.storeRepo.findOne({ where: { code: dto.code } });
      if (existing) throw new ConflictException('Store code already exists');
    }
    if (dto.name !== undefined) store.name = dto.name;
    if (dto.code !== undefined) store.code = dto.code;
    if (dto.address !== undefined) store.address = dto.address;
    if (dto.city !== undefined) store.city = dto.city;
    if (dto.state_province !== undefined) store.stateProvince = dto.state_province;
    if (dto.postal_code !== undefined) store.postalCode = dto.postal_code;
    if (dto.country !== undefined) store.country = dto.country;
    if (dto.phone !== undefined) store.phone = dto.phone;
    if (dto.email !== undefined) store.email = dto.email;
    if (dto.is_active !== undefined) store.isActive = dto.is_active;
    return this.storeRepo.save(store);
  }

  async deactivate(id: string): Promise<void> {
    await this.storeRepo.update(id, { isActive: false });
  }
}
