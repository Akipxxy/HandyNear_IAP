# HandyNear API

HandyNear is a REST API for discovering local handymen in Nairobi and managing service bookings (plumbing, electrical, carpentry and similar repairs). It is for developers building apps that need to list handymen, view a handyman's profile, and create or update bookings. It also has a **simulated customer wallet**: a customer tops up credit, and when a handyman finishes a job and the booking is marked `completed`, the server pays the handyman from that wallet.

- **Base URL (local):** `http://127.0.0.1:5000`
- **Data format:** JSON
- **Money:** all amounts are **integer cents** (100 cents = KES 1) and all money is **simulated**; no real payment is ever made
- **Interactive docs:** open `docs/index.html` in a browser (generated from `openapi.yaml`)

## Authentication

| Who | How | What they can reach |
|---|---|---|
| Anyone | nothing | `GET /api/handymen`, `GET /api/handymen/{id}` |
| Partner (Team 8 ShieldBox) | `X-API-Key: <their key>` header | `GET /api/bookings`, `GET /api/bookings/{id}` |
| Customer | login (`POST /api/auth/login`), then `Authorization: Bearer <token>` | their own wallet and bookings (`/api/bookings/mine`, `POST /api/bookings`) |
| Admin | `POST /api/auth/admin/login`, then the bearer token | everything, including `PATCH /api/bookings/{id}` and `GET /api/stats` |

- **Partner keys** live in `server/.env` as `PARTNER_API_KEYS=team8:<key>` (comma separated for more partners). A missing key returns `401 API_KEY_REQUIRED`; a wrong key returns `401 INVALID_API_KEY`. Keys are never logged: logs and `/api/stats` show only a label like `key-1a2b3c`.
- **Rate limit:** every `/api` route allows 100 requests per minute per key (or per IP when no key). Over the limit: `429 RATE_LIMITED` with a `Retry-After` header. Tune with `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`. Failed logins have their own stricter limit (10 per 15 minutes per IP).
- **Monitoring:** every request prints one line, for example `2026-11-10T05:12:01.220Z GET /api/bookings 401 3ms caller=none`. The caller is `key-xxxxxx`, `admin`, `customer` or `none`. Admins can read totals, error rate and the slowest route at `GET /api/stats` (numbers reset when the server restarts).

Try it (PowerShell, from `server/`; replace the placeholder with the key you were given):

```powershell
curl.exe -i http://127.0.0.1:5000/api/bookings                                   # 401 API_KEY_REQUIRED
curl.exe -i -H "X-API-Key: <your-key>" http://127.0.0.1:5000/api/bookings        # 200
```

## Run it locally (from a clean clone)

You need Node.js, Git, and MySQL or MariaDB (XAMPP works).

**1. Clone and install**
```bash
git clone https://github.com/Akipxxy/HandyNear_IAP.git
cd HandyNear_IAP/server
npm install
```

**2. Create the database and sample data.** Make sure MySQL is running, then from the repo root (`HandyNear_IAP`):
```bash
mysql -u root -p -e "source server/schema.sql"
```
Press Enter at the password prompt if your root password is empty. If `mysql` is not recognized on Windows with XAMPP, use the full path: `& "C:\xampp\mysql\bin\mysql.exe" -u root -p -e "source server/schema.sql"`.
This creates a `handynear` database with 3 handymen, 2 customers and 3 bookings (booking 3 is already completed and paid, so there is always a completed booking to read). `schema.sql` already contains the wallet changes, so do **not** also run `migrate-wallet.sql` after it.

**If you already have the `handynear` database from before the wallet feature:** do not re-import. Apply the update **once** instead, from the repo root:
```bash
mysql -u root -p -e "source server/migrate-wallet.sql"
```
(Windows XAMPP: use the full path to `mysql.exe` as above. In phpMyAdmin: click `handynear`, open the SQL tab, paste the contents of `server/migrate-wallet.sql` and press Go.) If it says `Duplicate column name`, it was already applied; skip it. The migration only touches bookings 1, 2 and 3; check them by hand if your old database had other bookings.

Check it worked (SQL tab or `mysql`):
```sql
SELECT id, handyman_id, customer_id, status, price_cents, payment_status FROM bookings;
SELECT * FROM customers;
```
You should see booking 1 (customer 1, 50000, unpaid), booking 2 (customer 2, 90000, unpaid), booking 3 (completed, 150000, paid), and 2 customers.

**3. Configure environment variables**
```bash
cd server
cp .env.example .env          # Windows Command Prompt: copy .env.example .env
```
Open `server/.env` and set:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=handynear
DB_PORT=3306
PORT=5000
```
Use your own MySQL user, password and port if they differ.

For the wallet, also add these lines. In development they point at our **stand-in MoneyMentor** (`server/flaky-partner.js`), so you never need a real key:
```
PARTNER_URL=http://127.0.0.1:4000
PARTNER_X_API_KEY=dummy-key
PARTNER_CUSTOMER_TOKEN=dummy-token
PARTNER_CUSTOMER_ID=1
PARTNER_REGISTER_BOOKINGS=true
```

| Variable | What it is |
|---|---|
| `PARTNER_URL` | Base URL of MoneyMentor's API (Team 6). Only our server uses it, never the browser. Development: the stand-in on port 4000. Never write a real or tunnel URL in a file you commit. |
| `PARTNER_X_API_KEY` | API key that identifies HandyNear to MoneyMentor. Development: a dummy value. A real key is issued privately by Team 6. |
| `PARTNER_CUSTOMER_TOKEN` | Customer bearer token (JWT) sent to MoneyMentor. They expire after 1 hour and are issued by Team 6's admin CLI. Our server holds one token, so only that customer's wallet works against the real MoneyMentor. Development: a dummy value. |
| `PARTNER_CUSTOMER_ID` | The customer the configured token belongs to (`1`). Used by the `server/wallet-check.js` helper script. |
| `PARTNER_REGISTER_BOOKINGS` | `true` makes `POST /api/bookings` (with a `customerId`) also register the booking with MoneyMentor so it can be paid later. A failed registration is only logged. Leave unset or `false` to skip it. |
| `PARTNER_API_KEYS` | Keys we issue to partner teams, as `name:key` pairs separated by commas. Required for `GET /api/bookings*`. Generate each key with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`. |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` | General rate limit. Defaults: 100 requests per 60000 ms. |
| `LOG_REQUESTS` | Set to `false` to silence the per-request log line. |

Never commit `server/.env` and never paste real keys, tokens or tunnel URLs into the repo or into chat. Restart the server after changing `.env`.

**4. Start the server** (from `server/`)
```bash
npm start
```
You should see `Server running on http://localhost:5000` (the server prints `localhost`; use `127.0.0.1` in your commands, because on Windows `localhost` can take about 2 seconds to resolve).

**5. Start the stand-in MoneyMentor** (second terminal, from `server/`; only needed for the wallet)
```bash
node flaky-partner.js
```
It listens on `http://127.0.0.1:4000` and keeps its data in memory. `http://127.0.0.1:4000/__reset` restores the starting data; `/__mode/slow`, `/__mode/error` and `/__mode/flaky` simulate failures and `/__mode/ok` returns to normal.

## Quickstart

In another terminal:
```bash
curl http://127.0.0.1:5000/api/handymen
```
(On Windows PowerShell, use `curl.exe` instead of `curl`.)

Response (`200 OK`):
```json
[
  {"id":1,"name":"John Mwangi","phone":"+254712345678","email":"john@example.com","nationalId":"12345678","serviceCategory":"Plumbing","hourlyRate":1500,"rating":4.5,"isAvailable":true,"location":"Westlands, Nairobi"},
  {"id":2,"name":"Grace Wanjiru","phone":"+254723456789","email":"grace@example.com","nationalId":"23456789","serviceCategory":"Electrical","hourlyRate":1800,"rating":4.8,"isAvailable":true,"location":"Kilimani, Nairobi"},
  {"id":3,"name":"Peter Otieno","phone":"+254734567890","email":"peter@example.com","nationalId":"34567890","serviceCategory":"Carpentry","hourlyRate":1200,"rating":4.2,"isAvailable":false,"location":"Lavington, Nairobi"}
]
```

## Try the live API

While the team is running a test, the API may also be reachable at a temporary public URL (a tunnel):

```
https://<current-tunnel-url>
```

```bash
curl https://<current-tunnel-url>/api/handymen
```

`<current-tunnel-url>` is a placeholder. Tunnel URLs change every time the tunnel restarts and the URL only works while the team's server and tunnel are running, so ask Team 7 for the current one. No API key is needed.

## Endpoints

Run the examples in order; later ones depend on earlier ones. All paths are relative to the base URL.

### GET /api/handymen
List handymen. Optional query parameters: `serviceCategory` (e.g. `Plumbing`) and `available` (`true` or `false`).

```bash
curl "http://127.0.0.1:5000/api/handymen?serviceCategory=Plumbing&available=true"
```
Response `200`: an array of handyman objects in the same shape as the Quickstart. Returns `[]` if nothing matches.

### GET /api/handymen/{id}
```bash
curl http://127.0.0.1:5000/api/handymen/1
```
Response `200`:
```json
{"id":1,"name":"John Mwangi","phone":"+254712345678","email":"john@example.com","nationalId":"12345678","serviceCategory":"Plumbing","hourlyRate":1500,"rating":4.5,"isAvailable":true,"location":"Westlands, Nairobi"}
```
An unknown id returns `404` (see Errors).

### GET /api/bookings
List bookings. Optional query parameters: `status` (`pending`, `confirmed`, `completed` or `cancelled`) and `handymanId` (a positive integer). Every booking also carries `customerId`, `priceCents` (integer cents) and `paymentStatus` (`unpaid` or `paid`); `customerId` and `priceCents` are `null` for bookings made without a customer. These three fields are optional for consumers and can be ignored.

**Needs `X-API-Key` (partner) or an admin login**, because it returns customer names and phones. Example for ShieldBox (a handyman's completed bookings): `curl.exe -H "X-API-Key: <your-key>" "http://127.0.0.1:5000/api/bookings?handymanId=1&status=completed"`.

```bash
curl -H "X-API-Key: <your-key>" http://127.0.0.1:5000/api/bookings
```
Response `200`:
```json
[
  {"id":1,"handymanId":1,"customerName":"Sarah Mwangi","customerPhone":"+254798765432","customerEmail":"sarah@example.com","serviceDescription":"Leaking kitchen sink faucet repair","scheduledTime":"2026-10-20T14:30:00.000Z","status":"confirmed","notes":null,"createdAt":"2026-10-14T06:34:07.000Z","customerId":1,"priceCents":50000,"paymentStatus":"unpaid"},
  {"id":2,"handymanId":2,"customerName":"David Kamau","customerPhone":"+254701234567","customerEmail":"david@example.com","serviceDescription":"Install ceiling light fittings","scheduledTime":"2026-10-22T10:00:00.000Z","status":"pending","notes":null,"createdAt":"2026-10-14T06:34:07.000Z","customerId":2,"priceCents":90000,"paymentStatus":"unpaid"}
]
```
The list is shortened here to the first two bookings; a third one (id 3, `completed`, `paymentStatus` `paid`, `priceCents` 150000) is also returned. `createdAt` will show the time you ran the schema import.

### POST /api/bookings
Create a booking. Required body fields: `handymanId` (number), `customerName`, `customerPhone`, `serviceDescription`, `scheduledTime` (ISO 8601 date-time). Optional: `customerEmail`, and the wallet fields `customerId` (integer, 1 or more) and `durationHours` (number above 0 and at most 24, default 1). New bookings always start with status `pending`.

Without `customerId` the booking behaves exactly as before: no price is stored and it never triggers a payment. With `customerId` the server stores `priceCents = round(hourlyRate x 100 x durationHours)`; an unknown handyman or customer returns `404`. To book for a customer, see the Wallet section below.

Mac/Linux:
```bash
curl -X POST http://127.0.0.1:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"handymanId":1,"customerName":"Test User","customerPhone":"+254700000000","serviceDescription":"Fix leaking tap","scheduledTime":"2026-10-25T10:00:00Z"}'
```

Windows PowerShell (PowerShell removes quotes inside `-d "..."`, so send the body from a file):
```powershell
curl.exe -X POST http://127.0.0.1:5000/api/bookings -H "Content-Type: application/json" -d "@examples/post-booking.json"
```
Run it from the repo root.

Response `201 Created`:
```json
{"id":3,"handymanId":1,"customerName":"Test User","customerPhone":"+254700000000","customerEmail":null,"serviceDescription":"Fix leaking tap","scheduledTime":"2026-10-25T10:00:00.000Z","status":"pending","notes":null,"createdAt":"2026-10-14T06:55:44.000Z","customerId":null,"priceCents":null,"paymentStatus":"unpaid"}
```

### GET /api/bookings/{id}
```bash
curl http://127.0.0.1:5000/api/bookings/1
```
Response `200`: a single booking object, same shape as the list items. An unknown id returns `404`.

### PATCH /api/bookings/{id}
Update a booking's `status` and/or `notes`. Send at least one.

**Heads-up: completing a booking that has a customer pays the handyman.** When `status` changes **to `completed`** on a booking with a `customerId` that is not yet paid, the server first asks MoneyMentor to move the booking price from the customer's wallet to the handyman. If that works, the booking becomes `completed` with `paymentStatus` `paid`. If it fails, the booking is **left unchanged** and you get `409` (`PAYMENT_FAILED`, for example insufficient balance; or `PAYMENT_NOT_READY`) or `502` (`PARTNER_UNAVAILABLE`). Sending `completed` again never charges twice, and bookings without a `customerId` complete with no payment. Seeded booking 1 belongs to customer 1, so the example below needs customer 1's wallet to hold at least 50000 cents (see the Wallet section).

Mac/Linux:
```bash
curl -X PATCH http://127.0.0.1:5000/api/bookings/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

Windows PowerShell (from the repo root):
```powershell
curl.exe -X PATCH http://127.0.0.1:5000/api/bookings/1 -H "Content-Type: application/json" -d "@examples/patch-booking.json"
```

Response `200`:
```json
{"id":1,"handymanId":1,"customerName":"Sarah Mwangi","customerPhone":"+254798765432","customerEmail":"sarah@example.com","serviceDescription":"Leaking kitchen sink faucet repair","scheduledTime":"2026-10-20T14:30:00.000Z","status":"completed","notes":null,"createdAt":"2026-10-14T06:34:07.000Z","customerId":1,"priceCents":50000,"paymentStatus":"paid"}
```
(This is the success response, with the booking paid.)

## Wallet / customers

All money here is **simulated**. Amounts are **integer cents** (100 cents = KES 1; display KES = cents / 100). The wallets and the ledger live at MoneyMentor Kenya (Team 6); HandyNear only stores customers, a booking price and a payment status. Only our server talks to MoneyMentor, never the browser.

> **Honesty note.** No real payment happens anywhere. Customer "login" is also simulated: a client simply picks a customer ID, there is no password. Only customers 1 and 2 are provisioned with wallets at MoneyMentor, and our server holds a single customer token, so against the **real** MoneyMentor only customer 1's wallet works. A customer you create yourself has no wallet until Team 6 provisions one, so their wallet calls return `404` or `502`. There is no "list customers" endpoint.

Run these from the repo root in PowerShell (use `curl.exe`, not `curl`; use `127.0.0.1`). PowerShell breaks JSON with escaped quotes, so each body is written to a file first. Delete the `.json` files when you finish and do not commit them. Make sure `node flaky-partner.js` (the stand-in MoneyMentor) and `npm start` are both running. Response values below show the **shape**; your IDs, timestamps and balances will differ.

### POST /api/customers
Body: `name` (max 100), `phone` (max 20), optional `email` (max 100).
```powershell
'{"name":"Test Customer","phone":"+254700000001"}' | Set-Content -Encoding ascii customer.json
curl.exe -X POST http://127.0.0.1:5000/api/customers -H "Content-Type: application/json" -d "@customer.json"
```
Response `201`:
```json
{"id":3,"name":"Test Customer","phone":"+254700000001","email":null,"createdAt":"<timestamp>"}
```
A missing `name` or `phone` returns `400 VALIDATION_ERROR`. This new customer has no wallet at MoneyMentor yet.

### GET /api/customers/{id}
```powershell
curl.exe http://127.0.0.1:5000/api/customers/1
```
Response `200`:
```json
{"id":1,"name":"Sarah Mwangi","phone":"+254798765432","email":"sarah@example.com","createdAt":"<timestamp>"}
```
`400 INVALID_ID` if the id is not a positive integer, `404 RESOURCE_NOT_FOUND` if it does not exist.

### GET /api/customers/{id}/wallet
```powershell
curl.exe http://127.0.0.1:5000/api/customers/1/wallet
```
Response `200`:
```json
{"customerId":1,"balanceCents":<cents>,"currency":"KES","simulated":true}
```
The balance is read live from MoneyMentor on every call (`Cache-Control: no-store`); we never show a cached balance. `404` if the customer is unknown or has no wallet at MoneyMentor, `502 PARTNER_UNAVAILABLE` if MoneyMentor is down or slow.

### POST /api/customers/{id}/wallet/topups
Requires an `Idempotency-Key` header (1 to 100 characters: letters, digits, `-` and `_`). Generate a **fresh** key for every top-up (a browser can use `crypto.randomUUID()`). The body must be exactly `{"amountCents": <integer 1 to 1000000000>}` and nothing else.
```powershell
'{"amountCents":100000}' | Set-Content -Encoding ascii topup.json
curl.exe -X POST http://127.0.0.1:5000/api/customers/1/wallet/topups -H "Content-Type: application/json" -H "Idempotency-Key: t1" -d "@topup.json"
```
Response `201` (a transaction):
```json
{"id":<n>,"customerId":1,"type":"topup","amountCents":100000,"balanceAfterCents":<cents>,"bookingId":null,"currency":"KES","simulated":true,"createdAt":"<timestamp>"}
```
Run the same command again with the same key and the same body: you get `201` with the **original** result and no second credit. Use a new key (for example `t2`) for a new top-up. Errors: `400 VALIDATION_ERROR` (missing key, bad amount, extra fields), `404`, `409 CONFLICT` (the key was already used for a different request, or the KES 10,000,000 balance limit would be exceeded), `502 PARTNER_UNAVAILABLE`.

### GET /api/customers/{id}/wallet/transactions
```powershell
curl.exe http://127.0.0.1:5000/api/customers/1/wallet/transactions
```
Response `200`: an array, newest first. Each item has `id`, `customerId`, `type` (`topup` or `payment`), `amountCents`, `balanceAfterCents`, `bookingId` (a number for payments, `null` for top-ups), `currency`, `simulated` and `createdAt`. Errors: `404`, `502`.

### Book a customer, then pay by completing the job
1. Book for customer 1 (handyman 1 costs KES 1,500 per hour, so 2 hours is 300000 cents):
```powershell
'{"handymanId":1,"customerId":1,"customerName":"Sarah Mwangi","customerPhone":"+254798765432","serviceDescription":"Fix sink","scheduledTime":"2026-11-20T14:30:00Z","durationHours":2}' | Set-Content -Encoding ascii booking-customer.json
curl.exe -X POST http://127.0.0.1:5000/api/bookings -H "Content-Type: application/json" -d "@booking-customer.json"
```
The `201` response has `"customerId":1,"priceCents":300000,"paymentStatus":"unpaid"`.

2. Top up customer 1 so the wallet covers the price (see the top-up example above).

3. Complete a booking (use seeded booking 1, which costs 50000 cents, or the new booking's id):
```powershell
'{"status":"completed"}' | Set-Content -Encoding ascii complete.json
curl.exe -X PATCH http://127.0.0.1:5000/api/bookings/1 -H "Content-Type: application/json" -d "@complete.json"
```
If the wallet has enough, the response is `200` with `"status":"completed"` and `"paymentStatus":"paid"`. If not, you get `409`:
```json
{"code":"PAYMENT_FAILED","message":"Insufficient wallet balance."}
```
and the booking stays as it was. Payment only happens on the change **to** `completed`, so to repeat the demo you must put the booking back to `confirmed`/`unpaid` (see Troubleshooting) and reset the stand-in by opening `http://127.0.0.1:4000/__reset`.

Clean up when you are done:
```powershell
Remove-Item customer.json, topup.json, booking-customer.json, complete.json
```

### Database update and what changed in the data
The wallet feature added a `customers` table and, on bookings, `customer_id`, `price_cents` (integer cents), `payment_status` (`unpaid` or `paid`) and `payment_transaction_id`. See "Run it locally" above for the update steps (`schema.sql` for a fresh database, `migrate-wallet.sql` once for an existing one).
## Errors

Every error is JSON with a `code` and a `message`. A success response never has a `code` field.

**404 Not Found** (`GET /api/handymen/999`):
```json
{"code":"RESOURCE_NOT_FOUND","message":"Handyman not found"}
```
For bookings the message is `"Booking not found"`.

**400 Validation error** (`POST /api/bookings` with an empty body `{}`):
```json
{"code":"VALIDATION_ERROR","message":"handymanId, customerName, customerPhone, serviceDescription, and scheduledTime are required"}
```
Other validation messages: `"handymanId must be a number"`, `"status must be one of: pending, confirmed, completed, cancelled"`, and `"at least one of status or notes must be provided"`.

**400 Invalid query parameter** (for example `GET /api/bookings?status=banana`):
```json
{"code":"INVALID_QUERY_PARAM","message":"status must be one of: pending, confirmed, completed, cancelled"}
```

**400 Invalid JSON** (body is not valid JSON):
```json
{"code":"INVALID_JSON","message":"Request body is not valid JSON"}
```

**400 Invalid id** (`GET /api/customers/abc`):
```json
{"code":"INVALID_ID","message":"Customer ID must be a positive integer"}
```

**401 Unauthorized** (only when `WALLET_API_KEY` is set on the server and `X-API-Key` is missing or wrong):
```json
{"code":"UNAUTHORIZED","message":"Missing or invalid API key"}
```

**404 Not found** for customers: `{"code":"RESOURCE_NOT_FOUND","message":"Customer not found"}`. If the customer exists but MoneyMentor has no wallet for them, the code is `NOT_FOUND` (wallet routes only) and the message comes from MoneyMentor.

**409 Conflict** (`POST .../wallet/topups`): code `CONFLICT` when an idempotency key was reused for a different request or the balance limit (KES 10,000,000) would be exceeded.

**409 Payment failed** (`PATCH /api/bookings/{id}` to `completed`; booking left unchanged):
```json
{"code":"PAYMENT_FAILED","message":"Insufficient wallet balance."}
```
`PAYMENT_NOT_READY` (also 409) means the booking is not registered with MoneyMentor yet.

**502 Partner unavailable** (MoneyMentor is down or too slow; nothing was changed):
```json
{"code":"PARTNER_UNAVAILABLE","message":"MoneyMentor is not responding. Try again in a minute."}
```

A few older `500` responses on handymen and bookings still use `{"error": "..."}` instead of `code` and `message`.

## Troubleshooting

- **Connection refused:** the server is not running. Start it with `npm start` in `server/`.
- **`{"error":"Failed to fetch handymen"}` or database errors:** check that MySQL is running and the values in `server/.env` match your database. Restart the server after editing `.env`.
- **`mysql` not recognized (Windows):** use the full path to `mysql.exe`, for example `C:\xampp\mysql\bin\mysql.exe`.
- **`ASCII '\0'` error when importing the schema:** `schema.sql` must be saved as UTF-8, not UTF-16.
- **Invalid JSON error on Windows:** use the `-d "@examples/..."` file form shown above, or write the body to a `.json` file and send it with `-d "@file.json"` (never inline JSON with escaped quotes).
- **`502 PARTNER_UNAVAILABLE` on a wallet call:** the stand-in MoneyMentor is not running (start `node flaky-partner.js` in `server/`), `PARTNER_URL` in `server/.env` is wrong, or the stand-in is in `slow`/`error` mode (`http://127.0.0.1:4000/__mode/ok`). Restart the API after editing `.env`.
- **`404` on a wallet call for a new customer:** a customer you created has no wallet at MoneyMentor until Team 6 provisions one. Use customer 1 (or 2).
- **`401 UNAUTHORIZED` on a customer call:** `WALLET_API_KEY` is set in `server/.env`; send the same value in an `X-API-Key` header, or remove it.
- **`Duplicate column name` when running `migrate-wallet.sql`:** it was already applied; skip it.
- **Booking 1 was already completed and the payment demo no longer works:** payment only happens when the status changes **to** `completed`. Put booking 1 back first (phpMyAdmin SQL tab), then reset the stand-in with `http://127.0.0.1:4000/__reset`:
  ```sql
  UPDATE bookings SET status = 'confirmed', payment_status = 'unpaid', payment_transaction_id = NULL WHERE id = 1;
  ```
- **Real MoneyMentor stops working after an hour:** its customer tokens expire after 1 hour. Ask Team 6 for a new one before each demo and put it in `server/.env` (never in the repo).
