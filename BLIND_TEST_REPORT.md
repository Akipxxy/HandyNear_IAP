# Blind Test Report — HandyNear API (Team 7)

**Lab:** Week 8 — API Documentation and Blind Test  
**Test type:** Simulated blind test / documentation-only review  
**Date:** 13 October 2026  
**Status:** A live API request and a real external-team swap were not performed as part of this simulation.

## 1. What happened when the README was tested

I approached the supplied `README.md` as a developer who had never worked with HandyNear and had no access to explanations from the API team. I used the README, `openapi.yaml`, `package.json`, `.env.example`, and `schema.sql` supplied for this review. I did not have the server source file (`index.js`), a running API URL, or access to a live database, so I could not start the service or verify a real HTTP response.

The README explains the API at a high level and states that authentication is not implemented yet. However, it stops after presenting a single `curl` command for `GET /api/handymen`. The supplied README appears incomplete: the code fence is not closed, and it does not include the setup steps required to run the project from a clean clone.

| Attempt | Result | Notes |
|---|---|---|
| Understand the purpose of the API | Partial success | The overview says HandyNear connects homeowners with local handymen for repairs, installations, and maintenance. |
| Understand authentication | Success, with a limitation | The README clearly says authentication is not available yet. |
| Install dependencies from a clean clone | Blocked | No `git clone`, `cd`, or `npm install` instructions are included. |
| Configure environment variables | Blocked | `.env.example` exists, but the README does not explain how to copy it to `.env` or populate the values. |
| Create and seed the database | Blocked | The README gives no database setup instructions. The supplied `schema.sql` does not include visible `CREATE TABLE` statements. |
| Start the API | Blocked | The README does not tell the reader to run `npm start` or explain prerequisites. `package.json` defines `npm start` as `node index.js`, but `index.js` was not supplied for this review. |
| Make the quickstart request | Not verified | `curl http://localhost:5000/api/handymen` is only expected to work after an API is running on the same computer. No live request was made, so a successful response cannot be claimed. |
| Try the other major endpoints | Blocked by missing examples | The README does not document request and response examples for individual handymen, listing bookings, creating bookings, retrieving a booking, or updating a booking. |
| Understand error responses | Blocked | The README does not show the documented 400 validation-error or 404 not-found response formats. |

**Time taken:** No timed, end-to-end test was performed. This was a simulated review of the supplied files, not a timed test by another team.

## 2. Documentation fixes and outstanding issues

### High-priority fixes

1. **Complete the README.** Add clean-clone installation instructions, database creation/import steps, `.env` setup, the command to start the server, and a quickstart command with an example response. Close the Markdown code fence.
2. **Add working endpoint examples.** Include a real request and a response for each major operation: `GET /api/handymen`, `GET /api/handymen/{id}`, `GET /api/bookings`, `POST /api/bookings`, `GET /api/bookings/{id}`, and `PATCH /api/bookings/{id}`. Use the actual API responses rather than inventing them.
3. **Document errors.** Show the actual JSON response for a 404 `RESOURCE_NOT_FOUND` and a 400 `VALIDATION_ERROR`. The OpenAPI file defines an `ErrorResponse` schema with `code` and `message`, but the precise runtime messages still need to be checked against the implementation.
4. **Make database setup reproducible.** The supplied `schema.sql` contains sample `INSERT` statements for `handymen` and `bookings`, but the visible dump does not contain table definitions. A clean user cannot rely on those inserts unless the tables have already been created. Regenerate a schema dump that includes table definitions, or provide verified `CREATE TABLE` statements before the seed data.
5. **Verify the API contract against the implementation.** The OpenAPI file documents six operations, but the server implementation was not included in the files reviewed. Confirm that the request fields, response fields, status codes, and filters match the running API.
6. **Generate and inspect the rendered docs.** Build the Redoc HTML from `openapi.yaml` and check that all six operations appear with request and response schemas. This review did not run the Redoc build.

### Specific issues observed in the supplied files

- `README.md` has only an overview, authentication note, and a quickstart command. It does not yet satisfy the lab's full README requirements.
- `schema.sql` has sample inserts but no visible `CREATE TABLE` statements, so it is not a self-contained database setup file as supplied.
- `schema.sql` appears to be encoded as UTF-16 with null bytes. Save or export it as UTF-8 plain text before relying on common command-line import instructions.
- In `openapi.yaml`, the `nationalID` property's example key is misspelled as `exapmle`, so that example will not be recognized by OpenAPI tooling.
- The `Handyman` schema includes `nationalID`. Confirm that this sensitive identifier is genuinely required in a public handyman profile; avoid exposing it if it is not needed by API consumers.
- The OpenAPI server URL is `http://localhost:5000`. That address refers to the reader's own computer, not the API author's computer. For a live blind test, supply a reachable shared URL or clear local-run instructions.
- `.env.example` includes the expected variable names but leaves all values blank. The README should explain how to fill them without publishing real credentials.
- `package.json` defines `npm start` as `node index.js`, but `index.js` was not among the supplied files, so the server could not be started or checked during this review.

### Suggested retest after fixes

1. Use a clean clone in a new directory.
2. Follow the README exactly, without relying on prior database tables or local environment settings.
3. Start the server and run the documented quickstart command.
4. Confirm the response status and body, then test the booking creation example.
5. Give only the README and reachable API URL to a teammate outside the usual partner group. Do not provide verbal hints.
6. Replace this simulated report's status and findings with the real team's observed results, actual elapsed time, and any corrections made.

## 3. Honest reflection

The supplied README is a useful starting point, but it is not yet sufficient for a stranger to set up and use the API independently. The quickstart command is easy to understand, but it assumes that the API is already running locally and that its database is configured. The missing installation, database, environment, endpoint-example, and error-reference instructions would prevent a new user from completing the task using the README alone. This conclusion is based on inspecting the supplied documentation files; it is **not** evidence that an external team attempted the API or that a live request failed. The real blind swap and live request still need to be performed and recorded honestly for the lab deliverable.
