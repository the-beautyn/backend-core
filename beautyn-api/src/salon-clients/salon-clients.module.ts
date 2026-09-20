import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { SalonClientLinker } from './salon-client-linker.service';
import { SalonClientsRepository } from './salon-clients.repository';
import { SalonClientsService } from './salon-clients.service';

/**
 * Salon clients (BEA-71): the per-salon people table behind the owner panel's
 * Clients page. Must not import BookingModule — the booking handler depends on the
 * linker, not the other way round.
 */
@Module({
  imports: [SharedModule],
  providers: [SalonClientLinker, SalonClientsRepository, SalonClientsService],
  exports: [SalonClientLinker, SalonClientsService],
})
export class SalonClientsModule {}
