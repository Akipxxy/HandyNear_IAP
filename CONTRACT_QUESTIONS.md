# CONTRACT_QUESTIONS.md
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