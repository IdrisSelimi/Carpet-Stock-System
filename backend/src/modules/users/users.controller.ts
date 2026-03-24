import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async list(
    @Query('store_id') storeId?: string,
    @Query('role') role?: UserRole,
    @Query('is_active') isActive?: string,
    @Query('search') search?: string,
  ) {
    const filters: { storeId?: string; role?: UserRole; isActive?: boolean; search?: string } = {};
    if (storeId) filters.storeId = storeId;
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search?.trim()) filters.search = search.trim();
    return this.usersService.findAll(filters);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentUser() user: User) {
    if (user.role === UserRole.STORE_WORKER && user.storeId !== id && id !== user.id) {
      return { statusCode: 403, message: 'Forbidden' };
    }
    return this.usersService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: User) {
    if (user.role === UserRole.STORE_WORKER && id !== user.id) {
      return { statusCode: 403, message: 'Forbidden' };
    }
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async deactivate(@Param('id') id: string) {
    await this.usersService.deactivate(id);
    return { message: 'User deactivated' };
  }
}
