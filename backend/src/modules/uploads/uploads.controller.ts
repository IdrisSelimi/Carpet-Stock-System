import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('product-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('product_id') productId: string,
    @Body('alt_text') altText: string,
    @Body('display_order') displayOrder: number,
    @Body('is_primary') isPrimary: boolean,
  ) {
    const imageUrl = file ? `/uploads/${file.filename || file.originalname}` : '';
    return this.uploadsService.saveProductImage(productId, imageUrl, {
      altText,
      displayOrder: displayOrder ?? 0,
      isPrimary: isPrimary ?? false,
    });
  }
}
