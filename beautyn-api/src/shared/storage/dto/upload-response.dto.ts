import { ApiProperty } from '@nestjs/swagger';

export class StorageUploadResponseDto {
  @ApiProperty({ description: 'Public URL of the uploaded file' })
  url!: string;

  @ApiProperty({ description: 'Bucket name' })
  bucket!: string;

  @ApiProperty({ description: 'File path within the bucket' })
  path!: string;
}
