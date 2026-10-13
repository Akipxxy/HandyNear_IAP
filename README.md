# HandyNear API

HandyNear is a RESTful API for discovering local handymen and managing service bookings for repairs, installations, and maintenance tasks. It provides endpoints to list and view handyman profiles, create bookings, retrieve bookings, and update booking details.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Requirements](#requirements)
- [Run Locally](#run-locally)
- [Quickstart](#quickstart)
- [API Endpoints](#api-endpoints)
- [Error Responses](#error-responses)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

## Overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/handymen` | List handymen, optionally filtered by service category or availability |
| GET | `/api/handymen/{id}` | Retrieve one handyman by ID |
| GET | `/api/bookings` | List bookings, optionally filtered by status |
| POST | `/api/bookings` | Create a booking |
| GET | `/api/bookings/{id}` | Retrieve one booking by ID |
| PATCH | `/api/bookings/{id}` | Update a booking's status or notes |

## Authentication

No authentication yet. Real auth arrives in Week 9.

## Requirements

- Node.js and npm
- MySQL or MariaDB
- Git
- `curl` for the quickstart example

## Run Locally

### 1. Clone the repository

Replace `<repository-url>` with your team's Git repository URL and `<repository-folder>` with the directory name created by Git:

```bash
git clone <repository-url>
cd <repository-folder>
```

### 2. Create the database

Create the database in MySQL/MariaDB if it does not already exist:

```sql
CREATE DATABASE handynear;
```

Then, from the repository root, import the schema:

```bash
mysql -u <db-user> -p handynear < schema.sql
```

Replace `<db-user>` with your database username. Enter the database password when prompted.

**Important:** The supplied `schema.sql` includes sample `INSERT` statements, but the version reviewed did not contain visible `CREATE TABLE` statements. Make sure the schema file creates the required tables before importing the sample rows, otherwise a clean setup may fail.

### 3. Install dependencies

Move into the server directory and install dependencies:

```bash
cd server
npm install
```

### 4. Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

On Windows Command Prompt, use:

```bat
copy .env.example .env
```

Open `server/.env` and fill in the values for your local setup. The expected variable names are:

```env
DB_HOST=localhost
DB_USER=your_database_username
DB_PASSWORD=your_database_password
DB_NAME=handynear
DB_PORT=3306
PORT=5000
```

These are example local values; use the actual credentials and port for your MySQL/MariaDB installation. Never commit or share your real `.env` file.

### 5. Start the server

From the `server` directory, run:

```bash
npm start
```

The supplied `package.json` defines this command as `node index.js`. If the server starts successfully on port 5000, the local API base URL is `http://localhost:5000`.

## Quickstart

Once the API server is running locally, execute:

```bash
curl http://localhost:5000/api/handymen
```

A successful response should be a JSON array of handyman objects. The exact response depends on the data in your database. The following is an **illustrative response shape**, not a captured live response:

```json
[
  {
    "id": 12,
    "name": "John Kamau",
    "serviceCategory": "Plumbing",
    "hourlyRate": 1500,
    "isAvailable": true,
    "location": "Nairobi"
  }
]
```

Before submitting, run this command against your API and replace the illustrative body with the actual response.

## API Endpoints

All paths below are relative to `http://localhost:5000`.

### 1. List handymen

`GET /api/handymen`

Optional query parameters:
- `serviceCategory` — filter by service category, e.g. `Plumbing`
- `available` — filter by availability, e.g. `true`

Example:

```bash
curl "http://localhost:5000/api/handymen?serviceCategory=Plumbing&available=true"
```

Expected success status in the OpenAPI contract: `200 OK`.

### 2. Get a handyman by ID

`GET /api/handymen/{id}`

Example:

```bash
curl http://localhost:5000/api/handymen/12
```

Expected success status: `200 OK`. A missing handyman is documented as `404 Not Found`.

### 3. List bookings

`GET /api/bookings`

Optional query parameter `status` accepts `pending`, `confirmed`, `completed`, or `cancelled`.

Example:

```bash
curl "http://localhost:5000/api/bookings?status=confirmed"
```

Expected success status: `200 OK`.

### 4. Create a booking

`POST /api/bookings`

Send JSON with `handymanId`, `customerName`, `customerPhone`, `serviceDescription`, and `scheduledTime`.

```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "handymanId": 12,
    "customerName": "Sarah Mwangi",
    "customerPhone": "+254798765432",
    "serviceDescription": "Leaking kitchen sink faucet repair",
    "scheduledTime": "2026-10-20T14:30:00Z"
  }'
```

Expected success status: `201 Created`. Confirm the exact returned fields and values against the running API.

### 5. Get a booking by ID

`GET /api/bookings/{id}`

```bash
curl http://localhost:5000/api/bookings/101
```

Expected success status: `200 OK`. A missing booking is documented as `404 Not Found`.

### 6. Update a booking

`PATCH /api/bookings/{id}`

The OpenAPI contract documents `status` and `notes` as update fields:

```bash
curl -X PATCH http://localhost:5000/api/bookings/101 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "notes": "Work completed ahead of schedule."
  }'
```

Expected success status: `200 OK`. Confirm that the booking ID exists before running this example.

## Error Responses

The OpenAPI contract defines an error object containing `code` and `message`.

### 404 Not Found

Illustrative response shape:

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "The requested resource could not be found."
}
```

### 400 Bad Request

The OpenAPI contract documents `400` for invalid query parameters or invalid booking requests. Illustrative response shape:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "The request contains invalid or missing fields."
}
```

The 400 message above is an example, not a verified runtime message. Check the running API and replace it with the exact response. Confirm that the implementation uses `VALIDATION_ERROR` for these cases.

## API Documentation

The OpenAPI contract is in `openapi.yaml`. From the repository root, generate a Redoc HTML page with:

```bash
npx @redocly/cli build-docs openapi.yaml -o docs/index.html
```

Open `docs/index.html` in a browser and verify that all six operations appear with their request and response schemas.

## Troubleshooting

- **Connection refused:** Make sure the server is running on port `5000`.
- **Database connection error:** Check that MySQL/MariaDB is running and the `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_PORT` values in `server/.env` are correct.
- **Missing table error:** Confirm that `schema.sql` creates the required tables before inserting sample rows.
- **Missing module error:** Run `npm install` from the `server` directory.
- **404 response:** Check the endpoint path and resource ID.
- **400 response:** Check JSON syntax, required fields, and allowed booking statuses.

