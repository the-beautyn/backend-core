import { getSchemaPath } from '@nestjs/swagger';

type Class<T = unknown> = new (...args: any[]) => T;

export function envelopeSchema(refDto: Class) {
  return {
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: getSchemaPath(refDto) },
      },
      example: {
        success: true,
        data: {},
      },
    },
  };
}
