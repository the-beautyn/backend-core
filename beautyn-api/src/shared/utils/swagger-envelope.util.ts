import { getSchemaPath } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

export const envelopeErrorSchema = (exampleData?: any) => ({
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      data: { $ref: getSchemaPath(ErrorResponseDto) },
    },
    example: {
      success: false,
      data: exampleData ?? { statusCode: 400, message: 'Bad Request', error: 'Bad Request' },
    },
  },
});

// Lightweight helpers (no big example payloads)
export const envelopeRef = (refDto: any) => ({
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: { $ref: getSchemaPath(refDto) },
    },
  },
});

export const envelopeArrayRef = (refDto: any) => ({
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: { $ref: getSchemaPath(refDto) },
      },
    },
  },
});

// Success-only envelope (no data key)
export const envelopeSuccessOnly = () => ({
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
    },
    example: { success: true },
  },
});
