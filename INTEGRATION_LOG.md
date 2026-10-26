# INTEGRATION_LOG.md — HandyNear (Team 7)

Upstream: MoneyMentor (Team 6). Downstream: ShieldBox (Team 8).

| # | What broke (symptom) | Root cause | Fix | Whose code, and who fixed it |
|---|---|---|---|---|
| 1 | First call returned 502 "no tunnel" | MoneyMentor's tunnel wasn't running (the URL had expired) | They sent a new URL | Partner infrastructure, fixed by partner |
| 2 | Calls without a token returned 401 | Their contract requires a bearer JWT on every route; we assumed no key | Requested a token for provider 1 | Contract mismatch with our plan, fixed together |
| 3 | Dashboard showed "Partner data unavailable" when their server was down | Tested on purpose (Part D): their URL was unreachable | Dashboard shows a friendly message and the rest still works | Our code, working as designed |
| 4 | ShieldBox asked 3 contract questions (category enum, available vs isAvailable, booking conflicts) | Our contract was ambiguous or silent | Answered them and documented in CONTRACT_DEVIATIONS.md | Our contract, fixed by us |

## First call (Part B)
- Time: 11:42 (Mon 26 Oct), from my machine
- Command: `curl.exe -i https://00da2582d51ed3.lhr.life/api/handymen/1/savings-goals` (no token)
- Expected (their contract): 401 `{"error": "A valid bearer token is required."}` without a token
- Got: 401 `{"error":"A valid bearer token is required."}`
- Result: matches the contract. Tunnel and API reachable; token needed for real data.
- Note: their CORS header allows only `http://localhost:3000`. This confirms the call must go from our server, not from the browser, which is how our route works.

| 6 | Dashboard showed live MoneyMentor data after token supplied | n/a: expected path | Mapped their snake_case fields (`goal_amount`, `current_amount`, `progress_percentage`) to camelCase in our `/api/partner/savings-goals` route | Our code, no bug |
| 7 | Their tunnel URL changed three times during the lab (lhr.life) | Free tunnel URLs are temporary and expire on restart | We read `PARTNER_URL` from `.env`, so only that line changed each time, with no code change | Partner infrastructure, worked around by us |
| 8 | Bearer token expired after one hour | Their README specifies 1-hour JWTs | Asked them to reissue before each test | Partner design, worked around together |