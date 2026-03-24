import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';

@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(private storesService: StoresService) {}

  @Get()
  async list(@Query('search') search: string) {
    return this.storesService.findAll(false, search?.trim() || undefined);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.storesService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async create(@Body() dto: CreateStoreDto) {
    const store = await this.storesService.create(dto);
    return store;
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async update(@Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.storesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async deactivate(@Param('id') id: string) {
    await this.storesService.deactivate(id);
    return { message: 'Store deactivated' };
  }
}
