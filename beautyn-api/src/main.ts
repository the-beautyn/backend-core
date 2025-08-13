import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';
import { LoginResponseDto } from './auth/dto/v1/login-response.dto';
import { RegisterResponseDto } from './auth/dto/v1/register-response.dto';
import { ResetPasswordResponseDto } from './auth/dto/v1/reset-password-response.dto';
import { MessageResponseDto } from './auth/dto/v1/message-response.dto';
import { ErrorResponseDto } from './shared/dto/error-response.dto';
import { UserResponseDto } from './user/dto/user-response.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation for all endpoints
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // Remove properties not in DTO
    forbidNonWhitelisted: true,  // Throw error for extra properties
    transform: true,        // Auto-transform payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true,  // Convert strings to numbers etc.
    },
  }));

  const transformInterceptor = app.get(TransformInterceptor);
  app.useGlobalInterceptors(transformInterceptor);

  const config = new DocumentBuilder()
    .setTitle('Beauty Marketplace API')
    .setDescription('Consolidated endpoints')
    .setVersion('0.1.0')
    .addBearerAuth() // optional JWT header
    .build();

  const doc = SwaggerModule.createDocument(app, config, {
    extraModels: [
      LoginResponseDto,
      RegisterResponseDto,
      ResetPasswordResponseDto,
      MessageResponseDto,
      ErrorResponseDto,
      UserResponseDto,
    ],
  });
  SwaggerModule.setup('api/docs', app, doc);

  // Serve Swagger JSON
  app.use('/api-json', (req: any, res: any) => {
    res.json(doc);
  });

  await app.listen(3000);
}
void bootstrap();
