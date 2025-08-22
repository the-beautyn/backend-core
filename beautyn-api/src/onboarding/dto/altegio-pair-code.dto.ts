import { ApiProperty } from '@nestjs/swagger';

export class AltegioPairCodeResponseDto {
  @ApiProperty({ example: '482913', description: '6-digit pairing code (valid for ~10 minutes)' })
  code!: string;

  @ApiProperty({ example: '2025-08-22T12:34:56.000Z' })
  expires_at!: string;
}
