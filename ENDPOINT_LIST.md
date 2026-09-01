# ENDPOINT_LIST.md — HandyNear (Team 7)

Every row below traces to a specific needs statement in `API_NEEDS.md`. Nothing here was
added because it "might be useful" — see the note at the bottom for what was deliberately
left out and why.

| Method | Path | Purpose | Maps to Need |
|---|---|---|---|
| GET | `/handymen/{id}` | Return a single handyman's public profile — id, service category, general service area. Does **not** include customer identity. | Need 1 (unique profile identifier); Need 4 (general service area, not customer address) |
| GET | `/bookings/{id}` | Direct lookup of one booking's reference data — booking id, handyman id, service category, completion status — for a reporter who already has a specific booking reference (e.g. from a receipt). | Need 2 (booking reference data at time of filing); Need 5 (completion status) |
| GET | `/handymen/{id}/bookings?status=completed` | List a handyman's completed bookings, each with its date/time, so a reporter who only knows the handyman (not a specific booking ID) can identify the correct visit. `status` is a query parameter, not a path segment, since it filters an existing collection rather than naming a distinct resource. | Need 3 (disambiguate between multiple bookings by date/time); Need 5 (only completed jobs are reportable — enforced here via the filter rather than client-side) |

## REST checklist self-audit
- **Nouns, not verbs:** `/handymen`, `/bookings` — no `/getHandyman` or `/checkBooking`.
- **Correct verb:** all three are GET, and that's accurate — every underlying need is a read, not an invention.
- **Pluralization:** `handymen` / `bookings` used consistently across all three rows.
- **Nesting:** one level max (`/handymen/{id}/bookings`), and it's a genuine ownership relationship — a booking only exists in the context of a handyman, so nesting is right here, not a query param.
- **Path vs. query:** identifiers (`{id}`) are in the path; `status` is a filter, so it's a query parameter, not nested.
- **No caller-specific logic:** nothing here says `?shieldbox=true` or bakes ShieldBox's identity into the URL — these are generic reads any authorized consumer could call.

## Known gap against this week's minimums — flagging rather than padding
This list has **3 endpoints, all GET** — short of the stated minimums of 5 total and at least
one write verb. Re-checked `API_NEEDS.md` line by line for anything involving "create,"
"update," or "change," per the handout's own troubleshooting table: there isn't one. Every
statement in Part B of Week 2 was framed as ShieldBox *reading* something from us, because
that's genuinely the shape of what an anonymous-reporting app needs from a booking platform —
it looks things up, it doesn't write back into our system.

Two options considered and rejected:
- **Inventing a write endpoint** (e.g. `POST /reports`) — rejected, since HandyNear doesn't own
  or store reports; that resource belongs to ShieldBox, not us. Adding it here would document
  an endpoint nobody asked for, which is the exact failure mode the handout opens with.
- **Splitting existing needs into more rows just to hit 5** — considered (e.g. a separate
  `/handymen` list endpoint), but rejected because no needs statement actually requires browsing
  all handymen; every need assumes a specific handyman/booking is already known from context of
  the report being filed. Padding the table with an ungrounded endpoint fails the "maps to a real
  need" check as surely as inventing a write one would.

Flagging this to the instructor as instructed, rather than working around it.

## Part C/D — peer review
Swapped with the Lost and Found team. Their audit: all 6 REST checklist items passed
clean (nouns, verb, pluralization, nesting, path vs. query, no caller-specific logic),
and they specifically confirmed flagging the missing write endpoint — rather than
inventing one — was the correct call.

**Response to their 5-endpoint suggestions — pushing back, not adopting:**

- `GET /categories` ("for system-wide validation") — no needs statement asks for this.
  Category is already a plain string returned inline on `/handymen/{id}` and
  `/bookings/{id}`; there's nothing to validate against a separate list. Kept out.
- `GET /handymen` (list/search by area) — already considered and rejected above, for
  the same reason: every need assumes a specific handyman is already known from the
  report being filed, not being searched for. Kept out.
- `GET /health` / `GET /status` — reasonable in a real API, but it doesn't trace to any
  needs statement either, so it wouldn't actually satisfy this lab's core rule (every
  endpoint maps to a real Week 2 need) — it would just be a different flavor of
  ungrounded endpoint. Kept out.

All three suggestions share the same shape: add something to hit a number rather than
because a need calls for it — the exact failure mode the handout opens with, and the
same reasoning our reviewer approved us for applying to the write-endpoint gap. Table
and endpoint count unchanged from the draft.
