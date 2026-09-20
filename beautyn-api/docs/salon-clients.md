# Salon clients

One row per person per salon, linked from bookings, so the owner panel can list a
salon's clients with a bookings count and last visit and show a client's history
(BEA-71). Rows are created and refreshed only by the booking write path; the panel
never edits them.

- [Data model](#data-model)
- [How a booking finds its client](#how-a-booking-finds-its-client)
- [Counters](#counters)
- [Owner endpoints](#owner-endpoints)
- [Back-fill](#back-fill)
- [Troubleshooting](#troubleshooting)

---

## Data model

`salon_clients` (Prisma `SalonClient`), plus `bookings.client_id` → `salon_clients.id`
(nullable, `ON DELETE SET NULL`).

| column | meaning |
|---|---|
| `salon_id` | the salon; the same person at two salons is two rows |
| `display_name`, `first_name`, `last_name` | what the panel shows; structured name from the source record |
| `name_key` | normalised name used for matching (see below) |
| `phone` | E.164 when the CRM value parsed, else the CRM's raw string — same rule as `bookings.client_phone` |
| `email` | lower-cased, trimmed |
| `avatar_url` | from the Beautyn account when there is one; CRMs carry no avatar |
| `user_id` | Beautyn account, when the person booked through the app |
| `altegio_client_id`, `easyweek_customer_id` | the CRM's own id for the person |
| `first_seen_at` | earliest linked booking |
| `last_visit_at`, `bookings_count` | see [Counters](#counters) |

Identity columns are indexed but **not unique**: the linker is the single writer and
serialises per salon, and a CRM data quirk must never fail a booking write.

## How a booking finds its client

Code: `src/salon-clients/client-identity.ts` (what a booking says about the person) and
`src/salon-clients/salon-client-linker.service.ts` (matching and merging). Both run
inside the booking handler's transaction on every create and update, and in the
back-fill.

**Rule (decision 2026-09-20): a phone or an email never links two records on its own.**
Contact details are shared — a family on one phone, the salon's own number typed as a
placeholder, one household email — so a contact match must be confirmed by the name.
Only the two exact identities match alone.

Lookup order within the salon, first hit wins, oldest row on a tie:

1. `user_id`
2. `altegio_client_id` / `easyweek_customer_id`
3. `phone` **and** `name_key` — phone must be a true E.164 number
4. `email` **and** `name_key` — email must look like an address

`name_key` is the first + last name (display name only as a fallback), NFKC-normalised,
lower-cased, apostrophes unified, split into tokens, **sorted** and joined. So
"Петренко Іван" = "Іван Петренко", but "Іван" ≠ "Іван Петренко" ≠ "Ivan Petrenko".
A record with a phone but no name has no key and can only match on steps 1–2.

No hit → a new row. Hit → merge:

- identifiers (`user_id`, CRM ids) are **fill-only**: learned once, never overwritten;
- profile fields follow the newest booking but are **never blanked**; a good E.164
  phone is not replaced by free text; `name_key` is recomputed from the merged name.

Consequences to know about: the same person spelled differently across sources gets
two rows; rows are never merged automatically (merge tooling is out of scope). A
booking with no usable identity keeps `client_id = NULL` and is absent from the
Clients page while still present in Bookings.

### The write-path rule

Two layers keep concurrent syncs from creating one person twice or blanking each
other's links, and neither depends on a code path remembering anything:

1. **The database refuses duplicates.** `(salon_id, user_id)`, `(salon_id,
   altegio_client_id)` and `(salon_id, easyweek_customer_id)` are unique. Whatever a
   path forgets, a second row for the same account / CRM client cannot exist; the linker
   catches the conflict and re-matches. Name+contact is a rule, not an identity (two
   people may share a phone), so it is indexed but not unique.
2. **One gatekeeper decides.** Every booking write path calls
   `SalonClientLinker.assign(tx, { bookingId, identity, mode })` inside its transaction,
   and nothing else. `assign` takes the per-salon advisory lock, re-reads the booking's
   current link, matches or creates, and decides: in `write` mode the identity may move
   the link (a payload with no identity keeps the current one); in `attach` mode a
   missing link is filled and an existing one is never touched. The caller then writes
   `client_id` and recomputes both returned clients.

Adding a path that touches client links? Call `assign` inside a transaction, write what
it returns, recompute both ids. Do not call `link` or read `client_id` yourself.

The lock (`pg_advisory_xact_lock(hashtext('salon_client:' || salon_id))`) is
transaction-scoped, which is why the back-fill and the Altegio purge wrap their work in
`$transaction` rather than using a bare client. Sync lanes and the internal bulk
handlers process bookings sequentially: fired concurrently they would all queue on that
lock, each holding a pooled connection.

## Counters

Recomputed (not incremented) for the affected client after every booking write — both
clients when a booking moves from one to another — and for purged clients in the
Altegio list reconciliation, the one write that bypasses the handler.

- `bookings_count` — linked bookings whose status is not `canceled`/`deleted`
  (`BOOKING_CANCELLED_STATUSES`), past and future.
- `last_visit_at` — latest such booking whose end (or start, when there is no end) is in
  the past — the same rule as the owner list's `completed` bucket.

`last_visit_at` is time-dependent: a booking in the future today is a past visit tomorrow
with no write in between. The sync re-reads every booking and returns early when nothing
changed; on that path the handler checks whether a linked past booking is newer than the
row's `last_visit_at` (one indexed read) and recomputes only then, so the value heals
within one slow-lane cycle.

## Owner endpoints

Guards: JWT + owner role + salon membership (`SalonAccessGuard`), like every
`/salons/:salonId/*` route. All responses are in the standard envelope.

| method | path | notes |
|---|---|---|
| GET | `/api/v1/salons/:salonId/clients` | `q` (name / email, case-insensitive; digits match the phone with or without `+380` formatting), `sort` = `name_asc` (default) \| `name_desc` \| `last_visit_desc` \| `bookings_desc`, `page`, `limit` (default 20, max 100) → `{ items, page, limit, total }` |
| GET | `/api/v1/salons/:salonId/clients/:clientId` | 404 for another salon's client as well |
| GET | `/api/v1/salons/:salonId/bookings?client_id=` | the existing owner list narrowed to one client; composes with `status` buckets, `from`/`to` and paging |

Owner booking responses carry `client_id`; client-app responses do not.

## Back-fill

Bookings written before the column have no client until the back-fill runs:

```bash
npm run backfill:clients:local            # or :dev / :stage / :prod
npm run backfill:clients:dev -- --dry-run
npm run backfill:clients:dev -- --salon=<salon uuid>
```

It walks bookings oldest first through the linker's `assign` gatekeeper in `attach`
mode (fill missing links only), then recomputes counters for every client of the
touched salons. Idempotent: a re-run reports `unchanged=N`. Safe while syncs are live: a
link a sync wrote meanwhile is never touched. `--relink` re-decides already-linked
bookings in `write` mode, for when the matching rule changes. Run it on each
environment once after the migration is deployed; rows synced in between are linked by
the handler anyway (an unchanged sync still attaches a missing client). `--dry-run`
reports eligibility only — it cannot tell a would-be-new row from a would-be-match
without writing.

## Troubleshooting

- **Counters look wrong for one client** — re-run the back-fill for that salon; it
  recomputes every client there.
- **One person, two rows** — check `name_key` on both; different spellings across
  sources are expected. If the keys match, the rows predate a fix; re-running the
  back-fill will not merge them (nothing does, by design).
- **Booking with `client_id = NULL`** — it has no account, no CRM id and no
  name+contact pair, or the phone is free text. `SELECT client_name, client_phone,
  client_email, user_id FROM bookings WHERE id = …` shows which.
