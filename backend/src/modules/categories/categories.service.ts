import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from '../../database/entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {}

  async findAll(activeOnly = false, search?: string): Promise<Category[]> {
    const qb = this.categoryRepo
      .createQueryBuilder('cat')
      .leftJoinAndSelect('cat.parent', 'parent')
      .orderBy('cat.displayOrder')
      .addOrderBy('cat.name');
    if (activeOnly) qb.andWhere('cat.isActive = :v', { v: true });
    if (search) {
      qb.andWhere('(cat.name ILIKE :search OR cat.slug ILIKE :search)', { search: `%${search}%` });
    }
    return qb.getMany();
  }

  async findTree(): Promise<Category[]> {
    const roots = await this.categoryRepo.find({
      where: { parentId: IsNull() },
      relations: ['children'],
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    for (const root of roots) {
      root.children = await this.loadChildren(root.id);
    }
    return roots;
  }

  private async loadChildren(parentId: string): Promise<Category[]> {
    const children = await this.categoryRepo.find({
      where: { parentId },
      relations: ['children'],
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    for (const c of children) {
      c.children = await this.loadChildren(c.id);
    }
    return children;
  }

  async findById(id: string): Promise<Category> {
    const cat = await this.categoryRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-');
    const existing = await this.categoryRepo.findOne({ where: { slug } });
    if (existing) throw new ConflictException('Category slug already exists');
    const category = this.categoryRepo.create({
      name: dto.name,
      slug,
      description: dto.description,
      parentId: dto.parent_id ?? null,
      displayOrder: dto.display_order ?? 0,
      isActive: dto.is_active ?? true,
    });
    return this.categoryRepo.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findById(id);
    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepo.findOne({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException('Category slug already exists');
    }
    if (dto.name !== undefined) category.name = dto.name;
    if (dto.slug !== undefined) category.slug = dto.slug;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.parent_id !== undefined) category.parentId = dto.parent_id;
    if (dto.display_order !== undefined) category.displayOrder = dto.display_order;
    if (dto.is_active !== undefined) category.isActive = dto.is_active;
    return this.categoryRepo.save(category);
  }

  async delete(id: string): Promise<void> {
    const cat = await this.findById(id);
    await this.categoryRepo.remove(cat);
  }
}
