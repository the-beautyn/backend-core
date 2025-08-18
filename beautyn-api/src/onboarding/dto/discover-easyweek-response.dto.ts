import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class EasyWeekSalonDto {
  @ApiProperty({ example: '0d3f7e7c-3a17-4a6a-8a2e-4d6b3e6f9a21' })
  @Expose()
  uuid!: string;

  @ApiProperty({ example: 'Main Street Salon' })
  @Expose()
  name!: string;
}

export class DiscoverEasyWeekResponseDto {
  @ApiProperty({ type: [EasyWeekSalonDto] })
  @Type(() => EasyWeekSalonDto)
  @Expose()
  salons!: EasyWeekSalonDto[];
}


