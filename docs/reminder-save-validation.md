# Reminder save recovery — October 7, 2026

The screenshots show Safari's transport error, `Load failed`, rather than a database validation message. A healthy rent save succeeded on the live site in Chrome. The exact cause of the original iPhone request cannot be determined from the screenshots; no device network trace or deployment log was available.

## Changes

- New reminder draft creation and saving now use one Server Action request. The same reminder ID survives retries.
- Retrying a new reminder whose earlier save committed returns that existing reminder instead of replaying revision 1 and failing with a conflict. Saved details are shown on its reminder page.
- Transport failures give recovery guidance while keeping entered fields. Submissions are guarded against repeated clicks.
- Purchase draft creation clears a rejected cached promise, allowing a subsequent request to run after the connection returns.
- Date editing uses the same useful transport-error message. Existing revision checks remain intact.

## Verified

| Check | Result and environment |
| --- | --- |
| Unit suite | 251 tests across 41 files passed locally (`npm test`). |
| Database suite | 138 integration tests passed against a fresh, isolated local PostgreSQL instance (`npm run test:db`), including recurrence, quotas, ownership, billing replay, document constraints, and notification scheduling. These tests did not apply migrations to hosted Supabase. |
| Static checks | `npm run lint`, `npm run typecheck`, and `git diff --check` passed. |
| Production build | `npm run build` passed. |
| Smoke checks | `SMOKE_URL=http://localhost:3101 npm run test:smoke` passed against the fresh production build: public/demo pages, signed-out private-route guards, cron authorization, and upload-origin protection. |
| Real authenticated saves | Local production application connected to the configured hosted Supabase project, using disposable test accounts. Chrome at 390×844 and Playwright WebKit at 390×844 passed the following checks. WebKit used an HTTPS production preview, matching the production HTTPS security policy. |
| Screenshot configuration | Rent, no biller, monthly recurrence without an end date, ₱8,450, and only the due-date alert persisted correctly. Test dates were November 1, 2032 to avoid triggering actual alert delivery. |
| Offline and reconnect | Both browsers displayed recovery guidance, preserved the name and amount, and saved successfully after reconnecting. |
| Lost response after commit | Both browsers completed the server save, deliberately dropped its response, then retried. The retry opened the same reminder ID, preserved its saved revision, and created no duplicate. |
| Cancellation and editing | Both browsers discarded a date edit without changing the stored amount, saved a subsequent amount edit, and cancelled a new reminder without creating a draft. |
| Capacity | Both browsers saved four reminders in a three-slot account. The first reminder had coverage; the fourth persisted with coverage off, rather than blocking the save. |
| Purchase draft retry | Both browsers retried and saved a purchase after an offline draft-creation request. |
| Persistence | Saved reminder pages loaded after a full reload in both browsers. |
| Public indexing | Rendered home, pricing, and loan-page titles, descriptions, and canonical URLs were checked in both engines. Demo and signed-out private destinations remained noindex. Public page source, sitemap, robots rules, and structured-data definitions were unchanged. |
| Cleanup | All disposable hosted authentication accounts and their reminders were deleted after the browser checks, including failed test attempts. |

The initial smoke run used an already-running older production process and returned a pricing-page 500. A fresh development process and the newly built production process both passed the complete smoke suite, including pricing. No pricing source change was needed.

## Limits and release status

- These code changes are local and have not been deployed to the live site.
- Playwright WebKit is browser-engine testing, not verification on a physical iPhone or an installed Home Screen app. iPhone backgrounding, LTE transitions, and installed-app behavior remain unverified.
- The temporary accounts signed in programmatically. The real Google OAuth interaction was not exercised.
- No real charge, refund, email delivery, push delivery, or SMS delivery was initiated. Those external integrations have local automated coverage where applicable, but this run does not establish end-to-end provider/device delivery.
- Browser tests exercised reminder creation, editing, cancellation, recovery, and purchase draft saving. Attachment upload/download was covered by existing automated database/unit tests and endpoint authorization checks, not a new live browser upload.
- A screenshot cannot distinguish connectivity loss, an interrupted request, a deployment change, or another browser transport failure. If the original error persists after deployment, capture the failing request and server logs before attributing it to a specific cause.
