# URTC 2027 Scheduling Portal

A conference scheduling application built on the existing React / Vinext portal, deployed to Cloudflare Workers through Sites. Presenters verify accepted submissions and reserve eligible slots. Organizers manage accepted research, private presenter keys, track blocks, booking locks, help requests, and schedule exports.

## Workflows

- Presenter: private key → review and save contact details → select a compatible time → explicitly confirm → download a calendar event. Returning sessions retain the booking. Rescheduling is atomic; help requests preserve existing bookings.
- Organizer: sign in with an approved ChatGPT account → add accepted submissions → copy each presenter’s key → create/reorder/edit track blocks → review bookings or export CSV. Submission and block deletion require a confirmation. Booked blocks cannot be deleted.
- New databases start empty. The organizer overview can explicitly load the original four sample submissions and six blocks into an empty conference. Sample keys are regenerated securely. Remove sample submissions and blocks before live intake.

## Local development

Requires Node 22.13+ and npm.

```sh
npm ci
cp .env.example .dev.vars
# For local Sites sign-in, set ORGANIZER_EMAILS=seedy@sites.test in .dev.vars.
npm run build
node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fearless_skullbuster.sql
npm run dev -- --host 127.0.0.1
```

Apply each migration once. The local Sites sign-in endpoint simulates `seedy@sites.test` only on loopback; it does not grant that account access to the hosted portal. `.dev.vars` is ignored and never shipped.

```sh
npm run typecheck
npm run lint
npm test
# Requires the local dev server and a disposable local sample conference:
npm run test:integration
npm run build
```

Lint covers application, domain, API, database, and tests. Unmodified bundled UI primitives and hooks retain their upstream lint configuration issues and are excluded from this project’s lint scope; TypeScript still checks the imported code. The obsolete untracked `app/page 2.tsx` is excluded from Git, TypeScript, and lint.

## Data and correctness

- `lib/scheduler.ts`: conference types, date helpers, generated periods, original sample records.
- `lib/scheduler-actions.ts`: validation and domain transitions, independently tested.
- `lib/server.ts`: D1 access, trusted identity, presenter-scoped responses, revisioned writes.
- `app/api/portal/route.ts`: HTTP boundaries, CSRF checks, session lifecycle, sign-in throttling.
- `db/schema.ts` and `drizzle/`: schema and generated migrations.

The authoritative conference document is stored in D1. Atomic compare-and-swap writes revalidate presenter bookings against the newest state; competing claims cannot both consume the same last spot. Organizer writes require the displayed revision and reject stale edits. Track/format, duration, capacity, room overlap, existing assignments, locks, and same-email presenter conflicts are validated on the server. A room is exclusive to one simultaneous block; parallel posters belong to a single block with multiple spots.

This document model is intended for a single conference with moderate traffic. It deliberately favors atomic integrity across block edits and bookings. A larger event should benchmark contention and migrate to normalized per-slot claims if necessary. The activity feed retains the latest 200 events and is not a compliance audit archive.

## Security and deployment

- `.openai/hosting.json` retains the original Site ID and declares logical D1 binding `DB`.
- Production `ORGANIZER_EMAILS` is configured through Sites to `geyujunamy@gmail.com`. The API requires both platform-authenticated identity and an exact, case-insensitive match in this allowlist.
- Sites controls overall audience separately from application roles. The existing owner-private audience is preserved. To let a lead or presenters visit, grant appropriate Site viewing access or intentionally change the Site audience through its sharing controls; an organizer allowlist entry alone does not bypass the Site gate.
- Presenter keys contain 128 random bits and are visible only in authorized organizer responses and that presenter’s session. The organizer distributes keys through their existing invitation process. Cookies are HttpOnly, SameSite=Strict, Secure on HTTPS, and expire after 12 hours. Only SHA-256 session token hashes are stored. Keys are bearer credentials; do not publish them.
- Sign-in is limited to 20 attempts per IP per 15-minute window. API errors do not reveal other submission records. State responses are private/no-store. Mutation requests require matching Origin and JSON. CSV values are escaped and neutralize spreadsheet formulas.
- Existing MVP browser-local records are not automatically imported into the shared database. Preserve any real records from the old organizer browser before transferring them; the original sample data is available through the explicit sample action.
- No email delivery service is configured. Help requests appear in the organizer queue; calendar downloads and exports are local downloads. Do not promise automatic email confirmations.
- Keep migrations append-only after deployment. Sites packages `dist/.openai/drizzle` and applies migrations before uploading the Worker.

The build remains based on the existing Vinext architecture. For an external institutional launch, confirm conference dates, rooms, tracks, organizers, privacy/retention requirements, and the Site’s intended audience with the conference lead.
