# INTEGRATION_LOG.md — HandyNear (Team 7)

Upstream: MoneyMentor (Team 6). Downstream: ShieldBox (Team 8).

> **Superseded in November 2026:** the savings-goals feature (rows 6 to 8 and the "First call" section below) was replaced by the customer wallet, and MoneyMentor's savings-goals routes now return 404. That history is kept as dated evidence. The wallet integration is logged in **Wallet integration (November 2026)** at the end of this file. One hygiene edit: the old tunnel host name in the "First call" command and in row 7 was replaced by a placeholder, because tunnel URLs expire and must not stay in the repo.

| # | What broke (symptom) | Root cause | Fix | Whose code, and who fixed it |
|---|---|---|---|---|
| 1 | First call returned 502 "no tunnel" | MoneyMentor's tunnel wasn't running (the URL had expired) | They sent a new URL | Partner infrastructure, fixed by partner |
| 2 | Calls without a token returned 401 | Their contract requires a bearer JWT on every route; we assumed no key | Requested a token for provider 1 | Contract mismatch with our plan, fixed together |
| 3 | Dashboard showed "Partner data unavailable" when their server was down | Tested on purpose (Part D): their URL was unreachable | Dashboard shows a friendly message and the rest still works | Our code, working as designed |
| 4 | ShieldBox asked 3 contract questions (category enum, available vs isAvailable, booking conflicts) | Our contract was ambiguous or silent | Answered them and documented in CONTRACT_DEVIATIONS.md | Our contract, fixed by us |

## First call (Part B)
- Time: 11:42 (Mon 26 Oct), from my machine
- Command: `curl.exe -i https://<partner-tunnel-url>/api/handymen/1/savings-goals` (no token)
- Expected (their contract): 401 `{"error": "A valid bearer token is required."}` without a token
- Got: 401 `{"error":"A valid bearer token is required."}`
- Result: matches the contract. Tunnel and API reachable; token needed for real data.
- Note: their CORS header allows only `http://localhost:3000`. This confirms the call must go from our server, not from the browser, which is how our route works.

| 6 | Dashboard showed live MoneyMentor data after token supplied | n/a: expected path | Mapped their snake_case fields (`goal_amount`, `current_amount`, `progress_percentage`) to camelCase in our `/api/partner/savings-goals` route | Our code, no bug |
| 7 | Their tunnel URL changed three times during the lab (free tunnel service) | Free tunnel URLs are temporary and expire on restart | We read `PARTNER_URL` from `.env`, so only that line changed each time, with no code change | Partner infrastructure, worked around by us |
| 8 | Bearer token expired after one hour | Their README specifies 1-hour JWTs | Asked them to reissue before each test | Partner design, worked around together |


## Wallet integration (November 2026)

Same table format as above. Only real events are listed; anything we have not measured is marked `TO FILL`.

| # | What broke (symptom) | Root cause | Fix | Whose code, and who fixed it |
|---|---|---|---|---|
| 9 | Our lecturer rejected the savings-goals integration (customers could see handymen's savings) | The feature exposed one role's financial data to another | We proposed an Uber Cash-style simulated wallet; the lecturer approved it and Team 6 agreed to support it | Our design, fixed by us; Team 6 changed their API |
| 10 | MoneyMentor's savings-goals and investment-projections routes returned 404 | Team 6 replaced them with wallet endpoints in contract 2.0.0 (commit `66aff41`, 5 Nov: wallet endpoints, cents, idempotency, customer tokens) | We replaced our savings-goals feature with the wallet | Partner change, adapted by us |
| 11 | We had no way to make MoneyMentor know our bookings, so a booking could not be paid | Payment reads the stored booking price and owner, and contract 2.0.0 had no registration route for us | We asked Team 6; they added `PUT /api/bookings/{id}` in contract 2.1.0 (commit `9023392`, 7 Nov): create-only, API key only; 201, 409 for an existing id, 400, 404 for an unknown wallet or handyman | Partner contract gap, fixed by partner |
| 12 | Their errors look different from ours | MoneyMentor returns `{"error": "..."}`, we return `{code, message}` | Our server maps their statuses to our codes and documents it as a deviation (`CONTRACT_DEVIATIONS.md`) | Our code (`server/moneymentor.js`), working as designed |
| 13 | Customer tokens stop working after one hour, and only customer 1 works live | Tokens are issued by Team 6's admin CLI and expire after 1 hour; our server holds one customer token | Ask Team 6 for a new token before each demo (put it in `server/.env`, never in the repo) | Partner design, worked around together |
| 14 | Completing a booking that was already completed before it had a customer or price did not trigger a payment | Payment only happens on the change **to** `completed` | Seeded booking 3 is `completed` + `paid` (so ShieldBox always has a completed booking); booking 1 must be reset to `confirmed` before a payment demo | Our design, documented |
| 15 | Inline JSON with escaped quotes failed in PowerShell | PowerShell strips the quotes inside `-d "..."` | Write the body to a JSON file and send it with `curl.exe -d "@file.json"` | Tooling, worked around by us |

### Local tests against our stand-in partner (`server/flaky-partner.js`)
Run by the author during local testing. These were **not** run against the real MoneyMentor.
- Top-up gave a balance of 100000 cents.
- Paying the same booking twice returned the same transaction (no second charge).
- Insufficient funds returned 409.
- Flaky mode was retried and succeeded.
- Error mode returned 502.

### Live test against the real MoneyMentor
`TO FILL` (paste real results only):
- Time and machine: `TO FILL`
- Command(s): `TO FILL`
- Expected (their contract): `TO FILL`
- Got: `TO FILL`
- Result: `TO FILL`
- Not tested live yet: top-up, payment on completion, and the 502 path against the real MoneyMentor. `TO FILL` when done.
