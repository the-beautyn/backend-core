import {
  BadRequestException, Controller, Delete, Param, Post, Query, UploadedFile, UseGuards,
  UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StorageService } from '../../../shared/storage/storage.service';
import { StorageUploadResponseDto } from '../../../shared/storage/dto/upload-response.dto';
import { envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../../shared/guards/roles.guard';
import { randomUUID } from 'crypto';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@ApiTags('Storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@Controller('api/v1/storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post(':bucket/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image to a storage bucket (admin only)' })
  @ApiOkResponse(envelopeRef(StorageUploadResponseDto))
  async upload(
    @Param('bucket') bucket: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<StorageUploadResponseDto> {
    const ext = MIME_TO_EXT[file.mimetype] ?? '.jpg';
    const path = `${randomUUID()}${ext}`;
    const url = await this.storage.upload(bucket, path, file.buffer, file.mimetype);
    return { url, bucket, path };
  }

  @Delete(':bucket')
  @ApiOperation({ summary: 'Delete an image from a storage bucket (admin only)' })
  @ApiOkResponse({ description: 'File deleted' })
  async remove(
    @Param('bucket') bucket: string,
    @Query('path') path: string,
  ) {
    if (!path) {
      throw new BadRequestException('path query parameter is required');
    }
    await this.storage.delete(bucket, path);
    return { deleted: true };
  }
}
