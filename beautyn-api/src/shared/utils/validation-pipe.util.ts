import { ValidationPipe } from '@nestjs/common';

// The global request validation main.ts installs. Kept in one place so a test
// can run a DTO through exactly the pipe production uses.
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true, // Remove properties not in DTO
    forbidNonWhitelisted: true, // Throw error for extra properties
    transform: true, // Auto-transform payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true, // Convert strings to numbers etc.
    },
  });
}
