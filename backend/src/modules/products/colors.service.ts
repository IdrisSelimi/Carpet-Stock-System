import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Color } from '../../database/entities/color.entity';
import { CreateColorDto } from './dto/create-color.dto';

@Injectable()
export class ColorsService {
  constructor(
    @InjectRepository(Color)
    private colorRepo: Repository<Color>,
  ) {}

  async findAll(): Promise<Color[]> {
    return this.colorRepo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Color> {
    const color = await this.colorRepo.findOne({ where: { id } });
    if (!color) throw new NotFoundException('Color not found');
    return color;
  }

  async create(dto: CreateColorDto): Promise<Color> {
    const existing = await this.colorRepo.findOne({ where: { colorCode: dto.color_code } });
    if (existing) throw new ConflictException('Color code already exists');
    const color = this.colorRepo.create({
      name: dto.name,
      colorCode: dto.color_code,
      hexValue: dto.hex_value,
    });
    return this.colorRepo.save(color);
  }
}
