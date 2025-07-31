import { getSchemaPath } from '@nestjs/swagger';

type Class<T = unknown> = new (...args: any[]) => T;

export const envelopeSchema = (refDto: any, exampleData: any) => ({
  schema: {
    properties: {
      success: { type: 'boolean', example: true },
      data: { $ref: getSchemaPath(refDto) },
    },
    example: {
      success: true,
      data: exampleData,
    },
  },
});
