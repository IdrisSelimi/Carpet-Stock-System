import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email: email.toLowerCase() },
      relations: ['store'],
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['store'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(filters?: { storeId?: string; role?: UserRole; isActive?: boolean; search?: string }) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.store', 'store')
      .orderBy('user.createdAt', 'DESC');
    if (filters?.storeId) qb.andWhere('user.storeId = :storeId', { storeId: filters.storeId });
    if (filters?.role) qb.andWhere('user.role = :role', { role: filters.role });
    if (filters?.isActive !== undefined) qb.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    if (filters?.search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    return qb.getMany();
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.first_name,
      lastName: dto.last_name,
      phone: dto.phone,
      role: dto.role as UserRole,
      storeId: dto.store_id ?? null,
    });
    return this.userRepo.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (dto.email && dto.email !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) throw new ConflictException('Email already in use');
    }
    if (dto.password) {
      (dto as Record<string, unknown>).passwordHash = await bcrypt.hash(dto.password, 12);
      delete (dto as Record<string, unknown>).password;
    }
    if (dto.first_name !== undefined) user.firstName = dto.first_name;
    if (dto.last_name !== undefined) user.lastName = dto.last_name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.store_id !== undefined) user.storeId = dto.store_id;
    if (dto.is_active !== undefined) user.isActive = dto.is_active;
    if (dto.email) user.email = dto.email.toLowerCase();
    return this.userRepo.save(user);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepo.update(userId, { lastLogin: new Date() });
  }

  async deactivate(id: string): Promise<void> {
    await this.userRepo.update(id, { isActive: false });
  }
}
