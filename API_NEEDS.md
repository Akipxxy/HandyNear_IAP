# API Needs Statements — HandyNear (Team 7)

## Context
- **Downstream partner (consumes our API):** Team 8 — ShieldBox (anonymous crime/safety reporting app)
- **Upstream partner (we consume their API):** Team 6 — MoneyMentor Kenya (financial literacy calculators)

## Needs Statements

1. ShieldBox needs to **read** a handyman's unique profile/booking identifier in order to correctly associate an anonymous safety report with the right service provider, without requiring or exposing the reporter's identity.

2. ShieldBox needs to **read** basic booking reference data (booking ID, handyman ID, service category) in order to give context to a report at the moment it's filed, without needing real-time sync or polling.

3. ShieldBox needs to **read** a booking's date/time in order to identify which specific service visit an anonymous report refers to, when the same handyman has more than one booking on file.

4. ShieldBox needs to **read** a handyman's general service area (e.g., "Westlands, Nairobi") — not the customer's home address — in order to give a report geographic context without exposing private customer location data.

5. ShieldBox needs to **read** a booking's completion status in order to only accept safety reports for jobs that have actually taken place, preventing reports on bookings that were requested but never fulfilled.

## Non-Functional Notes (Freshness / Volume / Auth)
- **Freshness:** Once-per-page-load is sufficient for all of the above — no real-time requirement identified.
- **Volume:** Called only when a report is being filed or a handyman profile is viewed — low, event-driven volume, not constant polling.
- **Auth:** Booking/handyman IDs are not sensitive on their own, but should not be joinable back to customer identity — confirm with Team 8 what minimum identifier they actually need.

## Sanity Check Against Week 1 Audit
- Handyman/Booking identifiers (1, 2) → ✅ maps to existing **Handymen** and **Bookings** resources in our audit.
- Booking date/time (3) → ✅ "time" is already part of the **Bookings** resource definition in our audit ("a request linking a user + handyman + service + time").
- Handyman general service area (4) → ✅ maps to the **Handymen/Providers** resource (`location` field already exists in the Browse page data).
- Booking completion status (5) → ✅ maps to the "Mark a booking complete" action already listed under our audited user actions.
- Flagged/report status (original statement 3) → ❌ **resolved as dropped**, not just flagged. It doesn't map to anything in our audit — HandyNear has no "flags" or "reports" resource — and the direction was backwards anyway (a flag would be something ShieldBox computes from its own reports, not something HandyNear could ever supply). Kept in the Reflection below as a design discussion, not resubmitted as a need.

## Upstream Exploration — MoneyMentor Kenya (Informational Only, Not Graded Needs Statements)

*Note: the statements below describe what HandyNear might want as a **consumer** of MoneyMentor's API. Per the handout, the graded needs statements in this document must come from Part B (what our downstream partner, ShieldBox, needs from us) — so this section is kept separate for reference and team discussion, not submitted as part of the required 3–6 statements.*

**Prepared by:** HandyNear Team | **Provider:** MoneyMentor Kenya | **Consumer:** HandyNear

- **Useful data/actions:** budget recommendations tailored to income level, savings progress tracking, investment growth calculators, expense categorization tools.
- **Purpose:** help handyman providers manage their earnings; help customers understand the financial implications of hiring a service; integrate financial literacy into everyday transactions.
- **Read vs. write:** primarily read-only; possible write access if HandyNear users want to sync personal budgets/expenses directly.
- **Frequency:** real-time for live dashboards, daily for summary reports, occasional for one-off calculators.
- **Open questions:** expense-category detail not yet confirmed; personalized projections based on user profile not yet confirmed; auth method (API keys vs. OAuth) and rate limits still need clarifying with Team 6.

**Team decision needed:** is this a genuine feature direction worth pursuing, or does it fall outside HandyNear's current scope? Either way, it doesn't affect the required needs statements above — resolve separately from the submission.

## Reflection

What surprised us most was how much confusion arose around *direction* rather than content. Two separate mix-ups came up during our interviews: first, when talking to Team 8 (ShieldBox), we initially answered questions as though HandyNear were the consumer looking to reuse ShieldBox's anonymous-reporting logic, when the actual need was the reverse — ShieldBox reading handyman/booking identifiers from us so an anonymous report can reference the right provider. Second, one of our own team members independently interviewed Team 6 (MoneyMentor) and came back with a full set of needs framed as HandyNear consuming their budgeting and investment calculators — which felt like real, useful functionality (helping providers track earnings, helping customers understand the cost of a job) but turned out not to be what Part D's needs statements are meant to capture at all, since those must come from our downstream partner's needs, not our own upstream wishlist. We also didn't expect ShieldBox's anonymity-by-design architecture to directly conflict with a feature we assumed was simple — a "look up whether this handyman is flagged" endpoint turns out to be in tension with the privacy guarantee that's core to their app, which is a real design constraint we hadn't considered before the interview. Overall, the exercise taught us that "what would be useful" and "what's actually available, in the direction the API is meant to flow" are two different questions, and conflating them almost led us to draft needs statements that wouldn't have matched our own resource audit.
