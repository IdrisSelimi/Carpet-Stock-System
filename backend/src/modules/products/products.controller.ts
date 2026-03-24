import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ColorsService } from './colors.service';
import { DimensionsService } from './dimensions.service';
import { VariantsService } from './variants.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { CreateColorDto } from './dto/create-color.dto';
import { CreateDimensionDto } from './dto/create-dimension.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private colorsService: ColorsService,
    private dimensionsService: DimensionsService,
    private variantsService: VariantsService,
  ) {}

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('category') categoryId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findAll({
      search,
      categoryId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('colors')
  async listColors() {
    return this.colorsService.findAll();
  }

  @Post('colors')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async createColor(@Body() dto: CreateColorDto) {
    return this.colorsService.create(dto);
  }

  @Get('dimensions')
  async listDimensions() {
    return this.dimensionsService.findAll();
  }

  @Post('dimensions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async createDimension(@Body() dto: CreateDimensionDto) {
    return this.dimensionsService.create(dto);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Query('include') include?: string) {
    const includeVariants = include?.split(',').includes('variants');
    return this.productsService.findById(id, includeVariants);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async delete(@Param('id') id: string) {
    await this.productsService.delete(id);
    return { message: 'Product deleted' };
  }

  @Get('variants/:id')
  async getVariant(@Param('id') id: string) {
    return this.variantsService.findById(id);
  }

  @Put('variants/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async updateVariant(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.variantsService.update(id, dto);
  }

  @Delete('variants/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async deleteVariant(@Param('id') id: string) {
    await this.variantsService.delete(id);
    return { message: 'Variant deleted' };
  }

  @Get(':id/variants')
  async getVariants(@Param('id') productId: string) {
    return this.variantsService.findByProductId(productId);
  }

  @Post(':id/variants')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  async createVariant(@Param('id') productId: string, @Body() dto: CreateVariantDto) {
    return this.variantsService.create(productId, dto);
  }
}
