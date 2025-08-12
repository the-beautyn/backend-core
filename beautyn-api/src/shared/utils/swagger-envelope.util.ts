import { getSchemaPath } from '@nestjs/swagger';

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
