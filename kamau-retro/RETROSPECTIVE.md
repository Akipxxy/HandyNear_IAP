# Retrospective: HandyNear (Team 7)

Kamau Mbiyu, ICS 2A

## 1. The hardest part of the lifecycle: Integration

Integration was the hardest stage, and the reason was because our integration changed twice, close to the deadline.

Our first integration with MoneyMentor (Team 6) read handymen's savings goals. Our lecturer rejected it because it let customers see another role's financial data. We pivoted to a simulated Uber Cash style wallet. At the same time, Team 6 rebuilt their API around that wallet. They removed the savings routes we were calling, and they started returning 404. Then we found their 2.0.0 had no way for us to tell them about our bookings, so a booking could not be paid. They added `PUT /api/bookings/{id}` in 2.1.0 on. So we were building against a contract that moved twice in three days, while our own database, routes, client and docs were also being rebuilt by four people.

On top of that, one-hour tokens and expiring tunnel URLs meant a correct call could still fail, and the 502 looked the same either way.

## 2. One real cross-team issue: wallet timeouts through Team 6's tunnel (10 November)

On 10 November, with the real MoneyMentor URL, key and token in my `.env`, every wallet call from our server failed. I assumed my credentials were wrong. The server log said otherwise: `partner call failed: GET /customers/1/wallet timeout`, then `502` after about 5.1 seconds. One call did return `200`, but it took 3211 ms. A `401` from them would have said `partner returned 401`, so the credentials were fine.

The cause was ours. `server/moneymentor.js` gave up on reads after 1500 ms and retried twice, which was tuned on our local stand-in partner and too tight for a tunnel. I made the timeouts configurable (`PARTNER_READ_TIMEOUT_MS` and `PARTNER_WRITE_TIMEOUT_MS`) and raised them in `.env`. After that, wallet reads returned `200` in 0.6 to 2.4 seconds, and completing a booking took about 0.8 seconds. Roughly ten minutes passed between the first timeout in the log and the first clean reads, once I stopped suspecting the key and read the log.

I also caused one for Team 8. On 10 November we made `GET /api/bookings` require a partner API key, because it was returning customer names and phones to anyone. That breaks ShieldBox's calls until they get a key. I recorded it as a breaking change in `CONTRACT_DEVIATIONS.md` and messaged them. Our log then showed a `GET /v2/handymen` with a `404` (we have no `/v2`), and later a correct `GET /api/handymen`.

## 3. What I would design differently

- **Ask about the integration earlier.** We built savings goals in Week 10 and only learned in November that it exposed one role's data to another. I would have put the privacy question to the lecturer and Team 6 in Week 2, in the needs statements. Changing the feature cost us a rebuilt database, routes, client and docs.
- **Agree the error shape in Week 3.** MoneyMentor returns `{"error": "..."}` and we return `{code, message}`. We handled it by mapping their statuses in `moneymentor.js` and documenting it, but it created a permanent inconsistency.
- **Build login first.** Our admin dashboard was reachable by anyone until 9 November, when we added customer and admin login. Security was a Week 9 task, but everything built before it had to change.
- **Measure timeouts on the real path.** Our 1500 ms came from a local stand-in, not a real tunnel.
- **Keep:** the contract written before the code, integer cents everywhere, the idempotency key on payments (`booking-{id}`), reading `PARTNER_URL` from `.env`, and the 91 automated tests.

## 4. My contribution

I owned the MoneyMentor integration and the partner side of the project: the wallet client (`server/moneymentor.js`), the retry and timeout logic, the stand-in partner for testing, and the live testing with Team 6. When Lance was unavailable I also did his part, the database changes and server routes for customers and bookings. I reviewed what Ruth (client) and Victor (docs) pushed, and I did the live debugging on the day: the MySQL connection resets, the tunnel timeouts, and the partner-key test with Team 8.

I should be clear about how much help I had. I used Claude for the server code and for the Demo Day slides. It wrote much of the code and the first versions of the docs. My job was to run it, test it against the real partner, read the logs, and decide what to change, which is how I found and fixed the timeout problem above.

Others carried me too. Team 6 added a route for our bookings within two days of my asking. Ruth built the login and account pages, and Victor kept the contract and docs in step with the code. Where I fell short: our blind test with an outside person is still not done, I had no request log or rate limit until 10 November, and a real JWT secret was in `server/.env.example` in the repo until I found and blanked it. 

Self-rating: 8.5/10. I took the lead an structured the whole project allowing my teammates to work effectively. I created majority of the server code and run the tests with other teams. However as the leader, I let my team down by allowing us to go with the savings goal API initially which caused us to rush towards the end of the semester.
