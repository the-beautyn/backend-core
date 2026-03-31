import { ApiProperty } from '@nestjs/swagger';

export class SavedSalonToggleResponseDto {
  @ApiProperty({ description: 'Whether the salon is now saved' })
  saved!: boolean;
}
