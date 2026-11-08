# CONTRACT_QUESTIONS.md

> **Superseded in November 2026:** questions 1 to 3 below are about MoneyMentor's calculator and savings endpoints. Those routes (savings goals, investment projections) now return 404 and our savings-goals feature was replaced by the customer wallet. The original questions are kept unchanged as dated evidence. The current questions are in **Wallet integration questions** at the end of this file.

## Upstream Partner Contract Review: Team 6 (MoneyMentor Kenya)
**Consumer:** Team 7 (HandyNear) | **Provider:** Team 6 (MoneyMentor Kenya)

### 1. Calculation Parameter Validation & Input Constraints
* **Endpoint / Scope:** Investment Growth & Savings Goal Calculators (e.g., `/api/calculators/investment-growth` or `/api/calculators/savings-progress`)
* **Question:** What are the exact input data types, required boundaries, and minimum/maximum numeric constraints for calculation parameters (such as principal amount, periodic deposit, interest rate, and duration)? If HandyNear passes a zero or negative duration/rate, does your contract define an explicit `422 Unprocessable Entity` or `400 Bad Request` schema with field-level validation messages, or does it return a generic error payload?

### 2. Expense Category Enums & Breakdown Granularity
* **Endpoint / Scope:** Expense Categorization & Budget Recommendations (e.g., `/api/budgets/recommendations` or `/api/expenses/categories`)
* **Question:** The upstream exploration specifies expense categorization to help handymen track operational overhead vs. net earnings, but the contract does not specify taxonomy. Does your contract provide a fixed `enum` of allowed expense categories (e.g., `["tools", "transport", "materials", "general_overhead"]`), or does it accept arbitrary strings? If fixed, is there an endpoint to dynamically fetch the supported categories?

### 3. Authentication Scheme & Rate-Limiting Policy
* **Endpoint / Scope:** Global API Security & Calculation Request Limits
* **Question:** How does MoneyMentor authenticate requests originating from HandyNear (e.g., static API key in the `X-API-Key` request header vs. a JWT bearer token via `Authorization: Bearer <token>`)? Furthermore, since HandyNear may query financial literacy projection endpoints on live dashboards, what are the exact rate-limit thresholds, and what are the header names (e.g., `X-RateLimit-Limit`, `X-RateLimit-Remaining`) and response payload structure returned on a `429 Too Many Requests` response?


## Wallet integration questions (November 2026)
**Consumer:** Team 7 (HandyNear) | **Provider:** Team 6 (MoneyMentor Kenya) | Contract versions 2.0.0 and 2.1.0

These are summaries of the three questions we sent Team 6 (not word-for-word copies) and their answers, as recorded in their `WALLET_INTEGRATION.md`.

### 1. Booking registration
* **Endpoint / Scope:** how MoneyMentor learns about our bookings so that `POST /api/bookings/{id}/pay` can read a stored price and owner.
* **Question:** Payment reads the booking price from MoneyMentor's own records. How can HandyNear register its bookings there, with an ID it chooses, without the customer being able to set the price?
* **Answer:** Team 6 added `PUT /api/bookings/{bookingId}` in contract 2.1.0 (commit `9023392`, 7 November 2026). It is server-to-server with the API key only (no bearer token), create-only, and takes exactly `{customer_id, handyman_id, amount_cents}` (positive integers; maximum 1000000000 cents). It returns `201` for a new pending booking, `409` for an existing ID (even with the same payload), `400` for invalid input and `404` for an unknown wallet or handyman. Existing booking IDs cannot be overwritten. Team 6 also noted that booking 1 already exists from an earlier demo and would return `409`, so it has to be coordinated rather than overwritten.

### 2. Customer tokens and wallet provisioning
* **Endpoint / Scope:** authentication for the wallet routes, and who creates a customer's wallet.
* **Question:** How do we obtain customer tokens, how long do they last, and how does a customer get a wallet at MoneyMentor?
* **Answer:** Customer tokens are bearer JWTs issued by Team 6's admin command-line tool and expire after 1 hour, so we must ask for a fresh one before each demo. There is no public token endpoint. Wallets are provisioned by Team 6: customers 1 and 2 are provisioned, so a customer created later through `POST /api/customers` has no wallet until Team 6 provisions one. Our server holds one customer token, so only that customer's wallet works against the real MoneyMentor.

### 3. ID alignment
* **Endpoint / Scope:** shared identifiers between the two systems (handymen, customers, bookings).
* **Question:** Will MoneyMentor use our IDs unchanged, and which handyman IDs does it know?
* **Answer:** Team 6 confirmed handymen IDs 1 to 3 (John Mwangi, Grace Wanjiru, Peter Otieno), provisioned customers 1 and 2, and uses HandyNear booking IDs unchanged.

### Related facts recorded on the way
* Team 6's wallet amounts are `*_cents` (integer cents) and their errors are `{"error": "..."}`; ours use `{code, message}`, so our server maps theirs (see `CONTRACT_DEVIATIONS.md`).
* Idempotency: the same `Idempotency-Key` with the same operation returns the original result; a different operation with the same key returns `409`.
