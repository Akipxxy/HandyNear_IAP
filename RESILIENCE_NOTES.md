# RESILIENCE_NOTES.md — HandyNear (Team 7)

> **Superseded in November 2026:** the feature measured in sections 1 to 5 below, the "Savings goals (via MoneyMentor)" box, was replaced by the customer wallet (our lecturer rejected savings goals; MoneyMentor's savings-goals routes now return 404). The measurements below are real, dated evidence and are kept unchanged. The retry rule in section 2 ("we never retry POST...") has also changed for the wallet: see **6. Wallet payments** at the end.

**Feature:** the "Savings goals (via MoneyMentor)" box on the HandyNear dashboard.
The browser calls our own route `GET /api/partner/savings-goals` (`server/routes/partner.js`),
which calls MoneyMentor's `GET /api/handymen/{id}/savings-goals` with a bearer token.
Retries and the timeout live in `server/resilientFetch.js`.

**Stand-in partner:** `server/flaky-partner.js` (modes: ok, slow, flaky, error), run on
port 4000. All timings below were measured against it, not against MoneyMentor.

## 1. What we tested

| # | Failure | What the user saw | What our log said |
|---|---|---|---|
| 1 | Partner slow (10 s), **before** any fix (Week 10 code) | The savings box sat on "Loading partner data..." for **10.23 s** | Nothing. The call just waited for the partner |
| 2 | Partner slow (10 s), **timeout only** (Part B) | The friendly "Partner data unavailable" answer after **1.73 s** instead of 10 s | `partner call failed: timeout` |
| 3 | Partner flaky (fails calls 1 and 2, works on call 3) | The page **succeeded**; the user never saw a failure | `attempt 1 failed, retrying in 200 ms`, then `attempt 2 failed, retrying in 400 ms` |
| 4 | Partner always returns 500 | No crash. The box showed saved data with the banner (or the friendly message if nothing was saved) | Exactly two retry lines, then `partner call failed: partner returned 500`. It stopped; no infinite loop |
| 5 | Partner slow, **with saved data** | The **same goals with the yellow banner** "Showing saved data from <time>. The partner is not responding." after about 5 s | Two retry lines, then `partner call failed: timeout` |
| 6 | Partner slow, **nothing saved** (API restarted) | The friendly red message "Partner data is unavailable right now. Try again in a minute." after **5.36 s**. No crash, rest of the dashboard unaffected | Two retry lines, then `partner call failed: timeout` |
| 7 | Real MoneyMentor unreachable or rejecting our credentials (Part E attempts) | The savings box did not show data | See "Real partner drill" below |

Test 1 is the "before" picture. Tests 2 to 6 are the "after" pictures for the timeout, the retries and the fallback.

## 2. Our numbers, and why

| Setting | Value |
|---|---|
| Normal response time (stand-in, `ok` mode) | **0.33 s** |
| Timeout | **1500 ms** |
| Retries | **2** (so at most 3 attempts) |
| Delay between attempts | **200 ms, then 400 ms** (doubles each time) |
| Worst-case wait, calculated | (2 + 1) x 1500 + 200 + 400 = **5100 ms** |
| Worst-case wait, measured | **5.36 s** |

- **Why 1500 ms:** a normal call took 0.33 s, so 1500 ms is about four and a half times
  normal. That leaves room for a bad moment but still cuts off a partner that has really stalled.
  The measured 1.73 s for the timeout-only test matches this (1.5 s plus overhead). One limit: we
  only measured the local stand-in. A real call through MoneyMentor's tunnel is slower and we never
  got a reliable timing for it, so 1500 ms is untested against real tunnel latency. If real calls
  turn out to take over about a second, the timeout should be raised and the worst case recalculated.
- **Why 2 retries and doubling delays:** a momentary failure (a restart, a dropped connection)
  usually clears within a moment, so a second attempt is worth making. Three attempts is the most
  the feature allows, and waiting 200 ms and then 400 ms avoids hammering a partner that is
  already struggling.
- **Why the worst case is acceptable:** the measured 5.36 s is slightly above the calculated
  5.1 s because of request overhead. The savings box loads on its own request, so the bookings
  and handymen tables appear straight away and only the box waits. A user is not stuck looking at
  a blank page.
- **What we never retry:** 400, 401, 403 and 404 (the request is wrong or the key is wrong, so
  asking again changes nothing), and anything that changes data (POST, PUT, PATCH, DELETE), because
  a retry could do it twice. `fetchWithRetry` only retries GET requests, and only for timeouts,
  connection failures, and the statuses 429, 500, 502, 503 and 504.

## 3. What a real user would experience without this code
With the Week 10 code, a slow partner left the savings box on "Loading partner data..." for
10 seconds or longer, and the user could not tell whether to wait or refresh. A flaky partner
that fails twice before working would have shown the red "unavailable" message on two page
loads out of three, even though a second attempt would have worked, so the user would think the
feature was broken and might leave. If the partner went down after a successful load, the box
would turn into an error where the savings goal had been showing a moment earlier, with nothing
to tell the user it was only a temporary problem. With the timeout, retries and saved-data
fallback, the same situations show a result within about 5 seconds: either the live numbers
(flaky), or the last saved goal clearly marked with the time it was saved (slow or down), or a
plain "try again in a minute" message when nothing has been saved yet. The rest of the dashboard
keeps working throughout.

## 4. Real partner drill (Part E)
We could not complete the drill with MoneyMentor. During the lab their tunnel URL and
bearer tokens kept expiring or stopped working before we could finish: their tunnel URL changes
whenever the free tunnel restarts, and their tokens only last a short time (20 minutes in our case).
We were sent a new URL and key several times, but we could still not get the savings goals to
display, and we did not manage to establish whether the cause was an expired token, their tunnel,
or a mistake on our side. We therefore ran the full drill against our own stand-in partner
(`server/flaky-partner.js`), as the handout allows. The "partner stopped" and "slow" cases are
tests 1 to 6 above. The "partner came back" step was **not demonstrated**, so we do not claim it.

This is still a useful finding: a partner's address and credentials can disappear without warning,
which is exactly the situation the timeout, capped retries and saved-data fallback are for.
Our log never contains the token: `partner.js` logs only the reason (`timeout`, an error code,
or `partner returned <status>`).

## 5. What we did not build
A circuit breaker is a switch that stops calling a partner that has been failing for a while and
tests it only occasionally. Ours still tries every request three times, so when the partner is
down every page load waits up to about 5 seconds before showing saved data or the message. With
a circuit breaker we would skip the partner straight away after a few failures and serve the saved
data at once, which would remove that wait and give the partner room to recover.

## 6. Wallet payments (November 2026)
The wallet (`server/moneymentor.js`, with retries in `server/resilientFetch.js`) calls MoneyMentor from our server only. Reads (balance, transactions) time out at **1.5 s**, writes (top-up, payment) at **5 s**, with **2 retries** after **200 ms, then 400 ms**.

- **Why POST retries need an idempotency key:** retrying a write could do it twice (two top-ups, or paying a booking twice). Our server retries a MoneyMentor POST **only when it carries an `Idempotency-Key`**, because MoneyMentor replays the original result for the same key. A payment uses the key `booking-{id}`, so paying the same booking again returns the same transaction and never charges twice. A write without a key is never retried. (This replaces the old "never retry POST" rule above, which was written for GET-only calls.)
- **Why money is never served stale:** unlike the old savings box, we do **not** show a saved copy when MoneyMentor is down. A wrong balance is worse than no balance, so wallet reads are sent with `Cache-Control: no-store` and we never show a cached balance. If MoneyMentor does not answer, the customer gets an error and can try again.
- **What happens on 409:** MoneyMentor refused the payment (for example insufficient balance). Our server returns `409 PAYMENT_FAILED` (or `409 PAYMENT_NOT_READY` if the booking is not registered with MoneyMentor) and leaves the booking **unchanged**. For a top-up, `409 CONFLICT` means the key was reused for a different request or the balance limit would be exceeded. Retrying does not help, so it is not retried.
- **What happens on 502:** MoneyMentor did not answer in time, was unreachable, or returned an error we do not pass through (401, 429, 5xx). Our server returns `502 PARTNER_UNAVAILABLE`. For a completion, the booking is left **unchanged**, because we pay first and only then update the booking. The customer can press complete again later; the same idempotency key means it cannot charge twice.
- **Tested locally against the stand-in (`server/flaky-partner.js`), not against the real MoneyMentor:** flaky mode was retried and succeeded; error mode returned 502; paying the same booking twice returned the same transaction; insufficient funds returned 409.
- **Measured timings:** `TO FILL` (we have no measured wallet timings to report yet; run the stand-in in `slow` mode and record the time of a wallet call before filling this in).
- **Not demonstrated:** the "partner came back" step against the real MoneyMentor. We do not claim it.
