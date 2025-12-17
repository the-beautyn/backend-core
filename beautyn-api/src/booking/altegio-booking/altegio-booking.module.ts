import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { AltegioBookingService } from './altegio-booking.service';
import { UserModule } from '../../user/user.module';
import { CrmIntegrationModule } from '../../crm-integration/core/crm-integration.module';

@Module({
  imports: [SharedModule, CrmIntegrationModule, UserModule],
  providers: [AltegioBookingService],
  exports: [AltegioBookingService],
})
export class AltegioBookingModule {}
