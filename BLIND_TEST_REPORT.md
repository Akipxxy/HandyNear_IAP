# BLIND_TEST_REPORT.md — HandyNear (Team 7)

## Status: no outside blind test has been done yet

As of 8 November 2026 **no person outside Team 7 has tested our documentation** (`README.md` and `docs/index.html`) without help. This report does not contain tester results. Do not read the checks below as a blind test: they were done by the people who wrote the docs. The table at the end is blank on purpose and must be filled in by a real tester.

## What the docs cover (and what a tester should try)
A tester starts from a clean clone and uses only `README.md` and `docs/index.html` (generated from `openapi.yaml`). The docs now cover the handymen and bookings endpoints and the simulated customer wallet: create a customer, top up with an `Idempotency-Key`, book with a `customerId`, complete a booking to pay the handyman, and read the errors.

## What was checked by the authors (not blind)
| Check | Result |
|---|---|
| `openapi.yaml` passes `npx @redocly/cli lint openapi.yaml` | `TO FILL` (the author records the result of running it) |
| `docs/index.html` rebuilt from `openapi.yaml` and opens | `TO FILL` |
| Every curl.exe example in the README run once against a running API and compared with the docs | `TO FILL` |
| Local test against our stand-in partner (`server/flaky-partner.js`), run by the author: top-up gave a balance of 100000 cents; paying the same booking twice returned the same transaction; insufficient funds returned 409; flaky mode retried and succeeded; error mode returned 502 | Done by the author locally (not against the real MoneyMentor, and not by an outside person) |
| Live test against the real MoneyMentor | `TO FILL` (not recorded yet) |

## What was NOT checked
- No outside person followed the README from a clean clone.
- Nobody outside the team checked whether the wallet section is understandable.
- The wallet was not tested live against the real MoneyMentor by an outside person.
- The docs were not tested on a machine other than a Windows PowerShell setup.

## TO FILL: blind test table (real tester only)
Never invent a tester or a result. Leave the cells as `TO FILL` until a real person has done the test.

| Field | Value |
|---|---|
| Tester name | TO FILL |
| Tester team or role (must not be in Team 7) | TO FILL |
| Date | TO FILL |
| Machine and operating system | TO FILL |
| What the tester was given (links only: README and `docs/index.html`) | TO FILL |

| Task | Did it work without help? (yes/no) | Where did they get stuck or confused? | Time taken | What we changed in the docs because of it |
|---|---|---|---|---|
| Clone the repo, create the database and start the API | TO FILL | TO FILL | TO FILL | TO FILL |
| `GET /api/handymen` | TO FILL | TO FILL | TO FILL | TO FILL |
| Create a customer (`POST /api/customers`) | TO FILL | TO FILL | TO FILL | TO FILL |
| Top up a wallet with an `Idempotency-Key` | TO FILL | TO FILL | TO FILL | TO FILL |
| Create a booking with a `customerId` and read `priceCents` | TO FILL | TO FILL | TO FILL | TO FILL |
| Complete a booking and see the payment (or the `409`/`502` error) | TO FILL | TO FILL | TO FILL | TO FILL |
| Understand an error response from the Errors section | TO FILL | TO FILL | TO FILL | TO FILL |

Overall verdict from the tester: `TO FILL`
