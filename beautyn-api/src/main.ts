import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';

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

  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, doc);

  await app.listen(3000);
}
bootstrap();
