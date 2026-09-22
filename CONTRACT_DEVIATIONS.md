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

### Notes
- All new fields were mapped in backend responses to align with the contract.  
- No breaking changes introduced; existing endpoints remain consistent.  
- Swagger UI verification confirms field names, types, and status codes match the updated contract.



