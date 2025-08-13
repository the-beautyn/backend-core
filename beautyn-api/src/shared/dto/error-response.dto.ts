import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Bad Request' },
      { type: 'array', items: { type: 'string' }, example: ['email must be an email'] },
    ],
    description: 'Error message or an array of validation messages',
  })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request', required: false })
  error?: string;
}


