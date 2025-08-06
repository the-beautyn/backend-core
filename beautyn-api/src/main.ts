import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';
import { LoginResponseDto } from './auth/dto/v1/login-response.dto';
import { RegisterResponseDto } from './auth/dto/v1/register-response.dto';
import { ResetPasswordResponseDto } from './auth/dto/v1/reset-password-response.dto';
import { MessageResponseDto } from './auth/dto/v1/message-response.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
