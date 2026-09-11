import { env } from 'cloudflare:workers';
import {
  emptyState,
  makePeriods,
  type SchedulerState,
  type PortalData,
} from './scheduler';
import { PortalError, applyAction } from './scheduler-actions';

type Bindings = { DB: D1Database; ORGANIZER_EMAILS?: string };
export const db = () => (env as unknown as Bindings).DB;
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function identity(request: Request) {
  const email = request.headers.get('oai-authenticated-user-email') ?? '';
  const signedIn = Boolean(
    request.headers.get('oai-authenticated-user-id') && email,
  );
  const allowed = ((env as unknown as Bindings).ORGANIZER_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const organizer = signedIn && allowed.includes(email.toLowerCase());
  const token = request.headers
    .get('cookie')
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith('urtc_session='))
    ?.slice('urtc_session='.length);
  const session =
    token && /^[a-f0-9]{64}$/.test(token)
      ? await db()
          .prepare(
            'SELECT submission_id FROM presenter_sessions WHERE token_hash = ? AND expires_at > ?',
          )
          .bind(await digest(token), Date.now())
          .first<{ submission_id: string }>()
      : null;
  return {
    email,
    signedIn,
    organizer,
    submissionId: session?.submission_id ?? null,
  };
}
export async function readState() {
  await db()
    .prepare(
      'INSERT OR IGNORE INTO conferences (id, revision, data) VALUES (?, 0, ?)',
    )
    .bind('urtc-2027', JSON.stringify(emptyState))
    .run();
  const row = await db()
    .prepare('SELECT revision, data FROM conferences WHERE id = ?')
    .bind('urtc-2027')
    .first<{ revision: number; data: string }>();
  if (!row) throw new Error('Conference unavailable');
  return {
    revision: row.revision,
    state: JSON.parse(row.data) as SchedulerState,
  };
}
export function visibleData(
  snapshot: Awaited<ReturnType<typeof readState>>,
  actor: Awaited<ReturnType<typeof identity>>,
): PortalData {
  const state = snapshot.state;
  const own = state.submissions.filter((s) => s.id === actor.submissionId);
  const blocks = actor.organizer
    ? state.blocks
    : state.blocks.filter((b) =>
        own.some(
          (s) =>
            b.track === s.track &&
            b.type === s.type &&
            b.presentationMinutes >= s.durationMinutes,
        ),
      );
  const occupancy: Record<string, number> = {};
  for (const b of blocks)
    for (const p of makePeriods(b))
      occupancy[p.id] = state.submissions.filter(
        (s) => s.assignedPeriodId === p.id && s.id !== actor.submissionId,
      ).length;
  return {
    ...actor,
    revision: snapshot.revision,
    occupancy,
    state: actor.organizer
      ? state
      : {
          submissions: own,
          presenters: state.presenters.filter((p) =>
            own.some((s) => s.presenterId === p.id),
          ),
          blocks,
          log: [],
        },
  };
}
export async function mutate(
  action: Record<string, unknown>,
  actor: Awaited<ReturnType<typeof identity>>,
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readState();
    // Organizer edits are never silently rebased over another organizer's changes.
    if (actor.organizer && action.revision !== current.revision)
      throw new PortalError(
        'The conference changed in another session. Refresh and review your changes before saving again.',
        409,
      );
    const next = applyAction(current.state, action, actor);
    const result = await db()
      .prepare(
        'UPDATE conferences SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
      )
      .bind(JSON.stringify(next), 'urtc-2027', current.revision)
      .run();
    if (result.meta.changes === 1)
      return { state: next, revision: current.revision + 1 };
  }
  throw new PortalError('The schedule is busy. Please try again.', 409);
}
