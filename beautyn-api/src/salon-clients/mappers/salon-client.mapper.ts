import { SalonClient } from '@prisma/client';
import { SalonClientDto } from '../dto/salon-client.dto';

export class SalonClientMapper {
  static toDto(row: SalonClient): SalonClientDto {
    return {
      id: row.id,
      display_name: row.displayName ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      avatar_url: row.avatarUrl ?? null,
      bookings_count: row.bookingsCount,
      last_visit_at: row.lastVisitAt ? row.lastVisitAt.toISOString() : null,
      user_id: row.userId ?? null,
      created_at: row.createdAt.toISOString(),
    };
  }
}
