import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dimension, DimensionUnit } from '../../database/entities/dimension.entity';
import { CreateDimensionDto } from './dto/create-dimension.dto';

@Injectable()
export class DimensionsService {
  constructor(
    @InjectRepository(Dimension)
    private dimensionRepo: Repository<Dimension>,
  ) {}

  async findAll(): Promise<Dimension[]> {
    return this.dimensionRepo.find({ order: { width: 'ASC', length: 'ASC' } });
  }

  async findById(id: string): Promise<Dimension> {
    const dim = await this.dimensionRepo.findOne({ where: { id } });
    if (!dim) throw new NotFoundException('Dimension not found');
    return dim;
  }

  async create(dto: CreateDimensionDto): Promise<Dimension> {
    const dimension = this.dimensionRepo.create({
      width: String(dto.width),
      length: String(dto.length),
      unit: dto.unit as DimensionUnit,
      displayName: dto.display_name,
    });
    return this.dimensionRepo.save(dimension);
  }
}
