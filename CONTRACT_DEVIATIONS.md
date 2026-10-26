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