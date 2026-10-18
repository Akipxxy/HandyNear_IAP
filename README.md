# HandyNear API

HandyNear is a REST API for discovering local handymen in Nairobi and managing service bookings (plumbing, electrical, carpentry and similar repairs). It is for developers building apps that need to list handymen, view a handyman's profile, and create or update bookings.

- **Base URL (local):** `http://localhost:5000`
- **Data format:** JSON
- **Interactive docs:** open `docs/index.html` in a browser (generated from `openapi.yaml`)

## Authentication

None yet. Every endpoint is open. Real authentication arrives in Week 9.

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
This creates a `handynear` database with 3 handymen and 2 bookings.

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

**4. Start the server** (from `server/`)
```bash
npm start
```
You should see `Server running on http://localhost:5000`.

## Quickstart

In a second terminal:
```bash
curl http://localhost:5000/api/handymen
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

While the team is running a test, the API is also reachable at:

```
https://miracle-encountered-prices-requiring.trycloudflare.com
```

```bash
curl https://miracle-encountered-prices-requiring.trycloudflare.com
```

The live URL only works while the team's server and tunnel are running.

## Endpoints

Run the examples in order; later ones depend on earlier ones. All paths are relative to the base URL.

### GET /api/handymen
List handymen. Optional query parameters: `serviceCategory` (e.g. `Plumbing`) and `available` (`true` or `false`).

```bash
curl "http://localhost:5000/api/handymen?serviceCategory=Plumbing&available=true"
```
Response `200`: an array of handyman objects in the same shape as the Quickstart. Returns `[]` if nothing matches.

### GET /api/handymen/{id}
```bash
curl http://localhost:5000/api/handymen/1
```
Response `200`:
```json
{"id":1,"name":"John Mwangi","phone":"+254712345678","email":"john@example.com","nationalId":"12345678","serviceCategory":"Plumbing","hourlyRate":1500,"rating":4.5,"isAvailable":true,"location":"Westlands, Nairobi"}
```
An unknown id returns `404` (see Errors).

### GET /api/bookings
List bookings. Optional query parameter `status`: `pending`, `confirmed`, `completed` or `cancelled`.

```bash
curl http://localhost:5000/api/bookings
```
Response `200`:
```json
[
  {"id":1,"handymanId":1,"customerName":"Sarah Mwangi","customerPhone":"+254798765432","customerEmail":"sarah@example.com","serviceDescription":"Leaking kitchen sink faucet repair","scheduledTime":"2026-10-20T14:30:00.000Z","status":"confirmed","notes":null,"createdAt":"2026-10-14T06:34:07.000Z"},
  {"id":2,"handymanId":2,"customerName":"David Kamau","customerPhone":"+254701234567","customerEmail":"david@example.com","serviceDescription":"Install ceiling light fittings","scheduledTime":"2026-10-22T10:00:00.000Z","status":"pending","notes":null,"createdAt":"2026-10-14T06:34:07.000Z"}
]
```
`createdAt` will show the time you ran the schema import.

### POST /api/bookings
Create a booking. Required body fields: `handymanId` (number), `customerName`, `customerPhone`, `serviceDescription`, `scheduledTime` (ISO 8601 date-time). Optional: `customerEmail`. New bookings always start with status `pending`.

Mac/Linux:
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"handymanId":1,"customerName":"Test User","customerPhone":"+254700000000","serviceDescription":"Fix leaking tap","scheduledTime":"2026-10-25T10:00:00Z"}'
```

Windows PowerShell (PowerShell removes quotes inside `-d "..."`, so send the body from a file):
```powershell
curl.exe -X POST http://localhost:5000/api/bookings -H "Content-Type: application/json" -d "@examples/post-booking.json"
```
Run it from the repo root.

Response `201 Created`:
```json
{"id":3,"handymanId":1,"customerName":"Test User","customerPhone":"+254700000000","customerEmail":null,"serviceDescription":"Fix leaking tap","scheduledTime":"2026-10-25T10:00:00.000Z","status":"pending","notes":null,"createdAt":"2026-10-14T06:55:44.000Z"}
```

### GET /api/bookings/{id}
```bash
curl http://localhost:5000/api/bookings/1
```
Response `200`: a single booking object, same shape as the list items. An unknown id returns `404`.

### PATCH /api/bookings/{id}
Update a booking's `status` and/or `notes`. Send at least one.

Mac/Linux:
```bash
curl -X PATCH http://localhost:5000/api/bookings/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

Windows PowerShell (from the repo root):
```powershell
curl.exe -X PATCH http://localhost:5000/api/bookings/1 -H "Content-Type: application/json" -d "@examples/patch-booking.json"
```

Response `200`:
```json
{"id":1,"handymanId":1,"customerName":"Sarah Mwangi","customerPhone":"+254798765432","customerEmail":"sarah@example.com","serviceDescription":"Leaking kitchen sink faucet repair","scheduledTime":"2026-10-20T14:30:00.000Z","status":"completed","notes":null,"createdAt":"2026-10-14T06:34:07.000Z"}
```

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

## Troubleshooting

- **Connection refused:** the server is not running. Start it with `npm start` in `server/`.
- **`{"error":"Failed to fetch handymen"}` or database errors:** check that MySQL is running and the values in `server/.env` match your database. Restart the server after editing `.env`.
- **`mysql` not recognized (Windows):** use the full path to `mysql.exe`, for example `C:\xampp\mysql\bin\mysql.exe`.
- **`ASCII '\0'` error when importing the schema:** `schema.sql` must be saved as UTF-8, not UTF-16.
- **Invalid JSON error on Windows:** use the `-d "@examples/..."` file form shown above.
