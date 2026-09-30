# Garage intake prototype

A mobile conversation that becomes a short, editable garage brief. Customer
requests survive closing the browser. Garage proposals return to the same
conversation through a simulated SMS containing a private link.

## Run locally

Requires Node 22.18+, npm and Docker (or an existing Postgres database).

1. From this directory, run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `AUTH_SECRET` to a random secret of at least 32 characters and
   choose `GARAGE_PASSWORD`. For example, generate a secret with
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
4. Run `docker compose up -d` (or set `DATABASE_URL` for your Postgres).
5. Run `npm run db:setup`.
6. Run `npm run dev`.
7. Open <http://localhost:3000/demo> and sign in with your garage password.

For a production build: `npm run build && npm start`.
Set `APP_URL` to the actual HTTPS origin when hosting the app; keep the same
`AUTH_SECRET` across deployments so saved return links and sessions keep working.
The server needs the four environment variables in `.env.example`.

## Two-minute demo

1. In `/demo`, choose **Start the Škoda conversation**. It opens a separate
   customer tab with the opening message ready to send.
2. Reply about warning lights, the knock, availability and anything forgotten.
   Suggested replies are available. Photos are optional.
3. Add a name and mobile. Registration/model are optional. Example contact:
   Sam Taylor, 07700900123, SK16 ODA, 2016 Škoda Octavia estate.
4. Send the request, then close the customer tab.
5. Open `/garage`. Review the three concerns and exclusions. Edit a concern
   or change its proposed action, then send a proposed next step.
6. Open `/demo` and use the **SMS preview** return link. The original
   conversation and proposal open even in a fresh browser.
7. Accept or request a change; the garage brief shows the response.

**Load a completed intake** skips directly to a fictional submitted example.
All sample contact/vehicle data are for demonstration only.

## Scope and implementation

- Next.js App Router, React, TypeScript and Postgres.
- `lib/intelligence.mjs` is an explicit, replaceable rule-based mock. It
  detects the demo's multiple concerns, chooses predefined follow-ups, skips
  some supplied details and preserves uncertainty. No AI API is called.
- The original transcript remains available behind the brief. Arbitrary
  customer corrections are retained as evidence; they are not reliably
  interpreted into every field. Staff can edit the brief.
- Vehicle details are customer supplied; there is no registration lookup.
- Warning lights and symptom reports are not diagnoses. Urgent reports stay
  flagged, even if a later answer sounds less urgent.
- Photos are saved with the conversation (maximum three, 2 MB each), with
  file-format checks. They are not analysed by the mock.
- `lib/notifications.ts` queues a simulated SMS in the same transaction
  as the proposal. **No SMS, WhatsApp message or email is sent.**
- Website, Google, WhatsApp, SMS and QR links all open `/start?from=…`.
  These are entry links, not native platform integrations. Check actual
  Google Business Profile link support before configuring a garage.
- No booking calendar, invoicing, payments, parts, CRM or account onboarding.
- Acceptance agrees the approach; appointment, diagnostic charge and repair
  approval remain separate.

## Access and persistence

Customer conversations use opaque 256-bit bearer links, with hashed database
lookup. Treat each return link as private. Garage APIs require a signed,
HTTP-only staff session; knowing a request ID does not grant staff access.
The raw return token is encrypted for notification generation. SMS previews
are visible only in the signed-in demo area.

Postgres stores drafts, issues, preferences, messages, photos and proposals.
Browser storage only remembers a return link and retry keys: it is not the
source of truth. Message retries are idempotent; row locks and revision checks
protect against lost updates. Old proposal IDs cannot approve newer proposals.

This is a one-garage prototype. Its shared staff password, single-process
login rate limit and JSON photo storage should be replaced with staff identity,
distributed abuse controls and object storage before a public customer pilot.
This repository contains only source and fictional fixtures, not customer data.

## Checks

`npm test` runs provider and access-token/session unit tests.

`npm run build` and `npm run typecheck` check the application.

For browser tests, start Postgres, run `npm run db:setup` and
`npm run build`, then install Chromium with
`npx playwright install chromium`. Export the four environment variables
from your local settings before running `npm run test:e2e`.
Playwright launches the production server. Tests cover a mobile photo intake,
garage editing, a fresh-browser SMS return, acceptance/change requests,
unauthorised access, retry handling and stale updates.

The branch's GitHub Actions workflow runs the same checks with an ephemeral
Postgres service and uploads a browser report with screenshots.
