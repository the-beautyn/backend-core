import { ApiProperty } from '@nestjs/swagger';

export class SalonShareDto {
  @ApiProperty({ example: 'https://stage.beautyn.com.ua/salon/abc123' })
  url!: string;

  @ApiProperty({ example: 'Nail bar: Glossy Room' })
  title!: string;

  @ApiProperty({ required: false, nullable: true, example: 'вул. Зеленицька, 15, 05-091, Київ' })
  description?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'https://cdn.example.com/cover.jpg' })
  image_url?: string | null;
}
