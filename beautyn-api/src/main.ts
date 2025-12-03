import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';
import { LoginResponseDto } from './auth/dto/v1/login-response.dto';
import { RegisterResponseDto } from './auth/dto/v1/register-response.dto';
import { ResetPasswordResponseDto } from './auth/dto/v1/reset-password-response.dto';
import { MessageResponseDto } from './auth/dto/v1/message-response.dto';
import { ErrorResponseDto } from './shared/dto/error-response.dto';
import { UserResponseDto } from './user/dto/user-response.dto';
import { OnboardingProgressDto } from './onboarding/dto/onboarding-progress.dto';
import { CrmProviderListResponseDto } from './onboarding/dto/crm-provider-list.dto';
import { CrmProviderDto } from './onboarding/dto/crm-provider.dto';
import { AltegioPairCodeResponseDto } from './onboarding/dto/altegio-pair-code.dto';
import { FinalizeEasyWeekResponseDto } from './onboarding/dto/finalize-easyweek-response.dto';
import { ServicesListResponseDto } from './services/dto/services-list.response.dto';
import { CategoryListResponseDto, CategoryResponseDto } from './categories/dto/category-response.dto';
import { ServiceDto } from './services/dto/service.dto';
import { WorkerDto } from './workers/dto/worker.dto';
import { SalonDto } from './salon/dto/salon.dto';
import { SalonListResponseDto } from './salon/dto/salon-list.response.dto';
import { SalonImageDto } from './salon/dto/salon-image.dto';
import { CrmSalonPreviewDto } from './onboarding/dto/crm-salon-preview.dto';
import { CrmSalonChangeDto } from './crm-salon-changes/dto/crm-salon-change.dto';
import { BookingDto } from './bookings/dto/booking.dto';
import { CrmCategoryDto, CrmCategoryPageDto } from './categories/dto/categories-sync-result.dto';
import { AppCategoryResponseDto } from './app-categories/dto/app-category-response.dto';
import { AppCategoryListResponseDto } from './app-categories/dto/app-category-list-response.dto';

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
      OnboardingProgressDto,
      CrmProviderListResponseDto,
      CrmProviderDto,
      AltegioPairCodeResponseDto,
      FinalizeEasyWeekResponseDto,
      ServicesListResponseDto,
      CategoryListResponseDto, 
      CategoryResponseDto,
      ServiceDto,
      WorkerDto,
      SalonDto,
      SalonListResponseDto,
      SalonImageDto,
      CrmSalonPreviewDto,
      CrmSalonChangeDto,
      BookingDto,
      CrmCategoryDto,
      CrmCategoryPageDto,
      AppCategoryResponseDto,
      AppCategoryListResponseDto,
    ],
  });
  SwaggerModule.setup('api/docs', app, doc);

  // Serve Swagger JSON
  app.use('/api-json', (req: any, res: any) => {
    res.json(doc);
  });

  const configService = app.get(ConfigService);
  const configuredPort = configService.get<string>('PORT');
  const portToListen = Number.parseInt(configuredPort ?? '3000', 10);
  await app.listen(portToListen);
}
void bootstrap();
