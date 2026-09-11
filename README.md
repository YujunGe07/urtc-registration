# URTC Scheduling Portal

Manage conference presentation scheduling in two dedicated workspaces: presenters review accepted submissions and reserve a slot; organizers manage submissions, configure track blocks, and review the program.

[Open the portal](https://yujunge07.github.io/urtc-registration/)

## Presenter walkthrough

Use **URTC-DEMO** to try reviewing a submission, choosing a time, and confirming a booking. Sample changes stay in the browser tab and never enter the shared conference database. **Reset demo** starts a fresh walkthrough. The demo date is a placeholder; calendar downloads become available for real bookings with a configured date.

## Organizer workspace

Enter an approved organizer email address. The current temporary entry mode checks the server-side allowlist without sending a confirmation email. **It does not verify email ownership: anyone who knows an approved address can access organizer records and presenter keys.** Restore verified authentication before collecting confidential submissions.

Organizers can add accepted submissions, distribute presenter keys, create and reorder track blocks, lock bookings, review help requests, and export the schedule. New blocks require an organizer-selected date. Booked blocks cannot be deleted or edited in ways that invalidate confirmed presentations.

## Development

Requires Node 22.13+ and npm.

```sh
npm ci
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
npm run build:pages
npm run preview:pages
```

Open `http://127.0.0.1:4173/urtc-registration/`.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run build:pages
```

## Deployment

GitHub Actions builds and publishes the frontend on pushes to `main`. Configure Pages to use GitHub Actions and set these repository variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The frontend uses `app/page.tsx`, `frontend/main.tsx`, and `vite.pages.config.ts`. The original server build remains available with `npm run build`.

Supabase hosts the shared database and the `portal` Edge Function. Apply migrations in `supabase/migrations` once, in order. Browser roles have no direct access to conference records or the organizer allowlist.

```sh
supabase functions deploy portal --project-ref rhnbdeowhxtjgzkhoczh --no-verify-jwt
```

The function applies application access checks itself. The gateway legacy JWT verifier stays disabled to support presenter sessions. Never put the service-role key in browser configuration; Supabase provides it to the server-side function.

## Scheduling behavior

Track, format, slot length, capacity, room conflicts, booking locks, and overlapping presentations are checked on the server. Atomic revision updates prevent competing requests from taking the same last spot. Stale organizer edits are rejected for review. Rescheduling releases the previous slot; requesting help preserves an existing booking.

Presenter sessions expire after 12 hours. The database stores token hashes; browser sessions use sessionStorage. The conference starts empty, and organizers enter the accepted submissions and actual scheduling dates. Help requests appear in the organizer queue; calendar events and schedule exports are downloads.

Core files:

- `lib/scheduler.ts`: types, sample records, and scheduling helpers.
- `lib/scheduler-actions.ts`: validation and scheduling transitions.
- `lib/portal-client.ts`: frontend API and organizer entry.
- `lib/presenter-demo.ts`: isolated presenter walkthrough.
- `supabase/functions/portal/index.ts`: shared API and database access.
- `tests/scheduler.test.ts`: scheduling integrity and role checks.

The obsolete `app/page 2.tsx` remains excluded from Git, builds, and lint.
