import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class NotificationUserDto {
  @ApiProperty({ example: '6f7c5b6e-1a2b-4c3d-8e9f-abcdef123456' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  @Expose()
  email!: string;

  @ApiProperty({ example: 'John', nullable: true, required: false })
  @Expose()
  name!: string | null;

  @ApiProperty({ example: 'Doe', nullable: true, required: false })
  @Expose()
  second_name!: string | null;

  @ApiProperty({ example: '+12345678901', nullable: true, required: false })
  @Expose()
  phone!: string | null;
}
