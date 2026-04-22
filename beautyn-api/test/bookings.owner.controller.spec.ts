jest.mock('@nestjs/swagger', () => ({
  ApiTags: () => () => {},
  ApiBearerAuth: () => () => {},
  ApiOkResponse: () => () => {},
  ApiOperation: () => () => {},
  ApiExtraModels: () => () => {},
  ApiProperty: () => () => {},
  ApiPropertyOptional: () => () => {},
  getSchemaPath: () => '#/components/schemas/Stub',
}));
jest.mock('../src/booking/dto/booking.response.dto', () => ({
  BookingResponseDto: class {},
  BookingListResponseDtoClass: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { OwnerBookingsController } from '../src/api-gateway/v1/authenticated/bookings.owner.controller';
import { BookingQueryService } from '../src/booking/booking-query.service';
import { BookingSyncService } from '../src/booking/booking-sync.service';
import { CrmIntegrationService } from '../src/crm-integration/core/crm-integration.service';

describe('OwnerBookingsController (unit)', () => {
  let controller: OwnerBookingsController;
  let bookingQuery: jest.Mocked<BookingQueryService>;
  let bookingSync: jest.Mocked<BookingSyncService>;
  let crmIntegration: jest.Mocked<CrmIntegrationService>;

  const salonId = '00000000-0000-0000-0000-000000000001';
  const bookingId = '00000000-0000-0000-0000-000000000002';

  beforeEach(async () => {
    bookingQuery = {
      listForSalon: jest.fn(),
      getForSalon: jest.fn(),
    } as any;
    bookingSync = {
      rebaseFromCrm: jest.fn(),
    } as any;
    crmIntegration = {
      enqueueBookingsSync: jest.fn(),
      resolveSalonProvider: jest.fn(),
    } as any;

    const moduleBuilder = Test.createTestingModule({
      controllers: [OwnerBookingsController],
      providers: [
        { provide: BookingQueryService, useValue: bookingQuery },
        { provide: BookingSyncService, useValue: bookingSync },
        { provide: CrmIntegrationService, useValue: crmIntegration },
      ],
    })
      .overrideGuard(require('../src/shared/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../src/shared/guards/roles.guard').OwnerRolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../src/brand/guards/salon-access.guard').SalonAccessGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get(OwnerBookingsController);
  });

  it('returns booking list', async () => {
    bookingQuery.listForSalon.mockResolvedValue({ items: [], next_cursor: null, limit: 20 });
    const res = await controller.list(salonId);
    expect(res.limit).toBe(20);
    expect(bookingQuery.listForSalon).toHaveBeenCalledWith(
      expect.objectContaining({ salonId }),
    );
  });

  it('returns a booking by id', async () => {
    bookingQuery.getForSalon.mockResolvedValue({ id: bookingId } as any);
    const res = await controller.get(salonId, bookingId);
    expect(res.id).toBe(bookingId);
  });

  it('syncs now', async () => {
    bookingSync.rebaseFromCrm.mockResolvedValue({ synced: 3 });
    const res = await controller.syncNow(salonId);
    expect(res.synced).toBe(3);
    expect(bookingSync.rebaseFromCrm).toHaveBeenCalledWith(salonId);
  });

  it('enqueues async sync', async () => {
    crmIntegration.resolveSalonProvider.mockResolvedValue('EASYWEEK' as any);
    crmIntegration.enqueueBookingsSync.mockResolvedValue({ jobId: 'job-1' });
    const res = await controller.syncAsync(salonId, {});
    expect(res.jobId).toBe('job-1');
    expect(crmIntegration.enqueueBookingsSync).toHaveBeenCalledWith(salonId, 'EASYWEEK');
  });
});
