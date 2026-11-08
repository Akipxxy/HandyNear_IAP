# CONTRACT_DEVIATIONS.md

## Week 5 Lab – Contract Deviations

### Added Fields
- **nationalId**  
  - Added to schema as `type: string` with a digit pattern (`^[0-9]{8,20}$`).  
  - Reason: Kenyan national IDs are numeric identifiers but must be treated as strings to preserve leading zeros and avoid numeric drift.

- **location**  
  - Added to schema as `type: string`.  
  - Reason: Database includes a `location` column for handyman records, and it is relevant to the API contract.

- **email**  
  - Added to schema as `type: string`, `format: email`.  
  - Reason: Email is required for communication with handymen and was missing from the original contract.

- **customerEmail (Bookings schema)**  
  - Added to schema as `type: string`, `format: email`.  
  - Reason: Customer contact information needed to be complete for bookings. This ensures each booking record includes a valid email address for communication and aligns with backend changes.

### Notes
- All new fields were mapped in backend responses to align with the contract.  
- No breaking changes introduced; existing endpoints remain consistent.  
- Swagger UI verification confirms field names, types, and status codes match the updated contract.

Week 6 Lab – Contract Deviations

No changes to openapi.yaml this week. Week 6's fixes (PATCH /api/bookings/{id} implementation, request-body field casing on POST /api/bookings, validation, response shaping) were all implementation bugs — the contract itself was already correct, so the contract was left unchanged and the code was fixed to match it.


## Week 8 Lab – Contract Deviations

### Added query parameter
- **`handymanId` on `GET /api/bookings`**
  - Added as an optional query parameter (`type: integer`) that returns only the bookings for that handyman. A `400` response (`INVALID_QUERY_PARAM`) was added for a non-integer value.
  - Reason: our downstream partner ShieldBox needs to list a specific handyman's completed bookings (Needs 3 and 5 in `API_NEEDS.md`). The planned `GET /handymen/{id}/bookings?status=completed` was not in the contract or the code. It is now covered by `GET /api/bookings?handymanId=12&status=completed`, with no new path.

### Corrected field name and typo
- **`nationalID` renamed to `nationalId`** in the `Handyman` schema.
  - Reason: the contract and the implementation disagreed. The API has always returned `nationalId`, and Week 5's deviation log already called it `nationalId`. The contract was corrected to match the code.
- **`exapmle` corrected to `example`** in the same property, so tooling recognises the example value.

### Notes
- No breaking changes for existing consumers. The new parameter is optional, and the corrected field name matches what the API already returns.
- `docs/index.html` was rebuilt from the updated `openapi.yaml`.

## Week 10 – Contract clarifications (answering ShieldBox's review)

- **`serviceCategory` filter:** free-text exact match, no enum. Unknown values return `200 []`, not `400`.
- **`available` filter:** query parameter is `available`, response field is `isAvailable`. `true` returns only available handymen, `false` only unavailable ones, omitted returns all. Other values return `400 INVALID_QUERY_PARAM`.
- **Booking conflicts:** not implemented. `POST /api/bookings` does not check `isAvailable` or overlapping bookings and always returns `201` with status `pending`. No `409` is defined. Known limitation; ShieldBox only reads bookings so it is not affected.

## 8 November 2026 – Wallet change (`openapi.yaml` 1.0.0 → 1.1.0)

Context: our lecturer rejected the savings-goals integration with MoneyMentor; we replaced it with a simulated customer wallet. The contract was extended and `docs/index.html` was rebuilt from it. The earlier entries above are unchanged.

### Added endpoints (all new, nothing removed)
- `POST /api/customers`, `GET /api/customers/{id}`
- `GET /api/customers/{id}/wallet`, `GET /api/customers/{id}/wallet/transactions`, `POST /api/customers/{id}/wallet/topups` (requires an `Idempotency-Key` header matching `^[A-Za-z0-9_-]{1,100}$`; body exactly `{"amountCents": integer 1..1000000000}`)
- New schemas: `Customer`, `CreateCustomerRequest`, `Wallet`, `WalletTransaction`, `TopupRequest`. New tags: Handymen, Bookings, Customers, Wallet. New optional security scheme `walletApiKey` (`X-API-Key`), enforced only when `WALLET_API_KEY` is set on the server (off in development).

### Changed existing operations (backwards compatible)
- **`POST /api/bookings`:** new optional request fields `customerId` and `durationHours`; with `customerId` the server stores `priceCents = round(hourlyRate x 100 x durationHours)`. New `404 RESOURCE_NOT_FOUND` for an unknown handyman or customer. Without `customerId` it behaves as before. `customerEmail` is now also listed in the request schema (the code already accepted it).
- **`Booking` response:** new optional fields `customerId` (nullable), `priceCents` (nullable integer cents) and `paymentStatus` (`unpaid` | `paid`). `Booking.required` is unchanged, and nothing was renamed or removed. `customerEmail` and `notes` are now marked `nullable` because the API already returned `null` for them.
- **`PATCH /api/bookings/{id}`:** completing a booking that has a customer and is not yet paid now pays the handyman first. New responses: `409 PAYMENT_FAILED`, `409 PAYMENT_NOT_READY`, `502 PARTNER_UNAVAILABLE`; on any of them the booking is left unchanged. Payment only happens on the change **to** `completed`.
- **`GET /api/bookings`:** documented the `400 INVALID_QUERY_PARAM` response that the code already returned.
- **ShieldBox-facing operations are unchanged:** `GET /api/handymen`, `GET /api/handymen/{id}`, `GET /api/bookings`, `GET /api/bookings/{id}` and `GET /api/bookings?handymanId=&status=completed` behave as before. The `Handyman` schema is unchanged.

### New error codes
`INVALID_ID`, `CONFLICT`, `PAYMENT_FAILED`, `PAYMENT_NOT_READY`, `PARTNER_UNAVAILABLE`, `UNAUTHORIZED` (and the existing `VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, `INVALID_QUERY_PARAM`, `INVALID_JSON`, `INTERNAL_ERROR`). Also `NOT_FOUND`: when MoneyMentor has no wallet for a customer, our wallet routes pass the 404 through with code `NOT_FOUND`, while our own 404s use `RESOURCE_NOT_FOUND`. This inconsistency is in the code (`server/moneymentor.js`) and is documented here rather than hidden. A few legacy `500` responses on handymen and bookings still use `{"error": "..."}`.

### Deviations from the upstream (MoneyMentor) contract
- **Error shape:** MoneyMentor returns `{"error": "..."}`; HandyNear returns `{code, message}`. Our server maps their statuses: 400 → `VALIDATION_ERROR`, 404 → `NOT_FOUND`, 409 → `CONFLICT` (`PAYMENT_FAILED` when paying a booking), anything else (401, 429, 5xx, timeout) → `502 PARTNER_UNAVAILABLE`.
- **Field names:** their snake_case `*_cents` fields are mapped to our camelCase `*Cents` fields. Money is integer cents on both sides.
- **Authentication:** only our server talks to MoneyMentor (API key plus a 1-hour customer token); the browser never sees them.

### Other changes in this entry
- `servers[0].url` is now `http://127.0.0.1:5000` (on Windows `localhost` can take about 2 seconds).
- Added `operationId`s and a global `security: []` (so the linter's `security-defined` rule passes). Public endpoints need no key.
- Known limitations: customer "login" is simulated (a client picks a customer ID); a new customer has no wallet at MoneyMentor until Team 6 provisions one; there is no "list customers" endpoint; and completing a booking that was already completed before it had a customer or price does not trigger a payment (payment only happens on the change to `completed`).

### Notes
- No breaking changes for existing consumers; ShieldBox can ignore the new fields.
- `docs/index.html` was rebuilt from the updated `openapi.yaml`.
