import {
  db,
  digest,
  identity,
  mutate,
  readState,
  visibleData,
} from '@/lib/server';
import { PortalError } from '@/lib/scheduler-actions';
export const dynamic = 'force-dynamic';
const json = (
  data: unknown,
  status = 200,
  extra: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
function errorResponse(error: unknown) {
  if (error instanceof PortalError)
    return json({ error: error.message }, error.status);
  console.error('Portal request failed', error);
  return json(
    {
      error:
        'The scheduling service is temporarily unavailable. Your changes have not been saved. Please try again.',
    },
    503,
  );
}
export async function GET(request: Request) {
  try {
    return json(visibleData(await readState(), await identity(request)));
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    if (
      request.headers.get('origin') !== new URL(request.url).origin ||
      !request.headers.get('content-type')?.includes('application/json')
    )
      throw new PortalError('Request origin could not be verified.', 403);
    const text = await request.text();
    if (text.length > 20000)
      throw new PortalError('Request is too large.', 413);
    let action: Record<string, unknown>;
    try {
      action = JSON.parse(text);
    } catch {
      throw new PortalError('Invalid request.');
    }
    if (!action || typeof action !== 'object' || Array.isArray(action))
      throw new PortalError('Invalid request.');
    const cookie = (token: string, age: number) =>
      `urtc_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
    if (action.kind === 'logout') {
      const token = request.headers
        .get('cookie')
        ?.match(/(?:^|;\s*)urtc_session=([a-f0-9]{64})(?:;|$)/)?.[1];
      if (token)
        await db()
          .prepare('DELETE FROM presenter_sessions WHERE token_hash = ?')
          .bind(await digest(token))
          .run();
      return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
    }
    if (action.kind === 'login') {
      const ip = request.headers.get('cf-connecting-ip') ?? 'local';
      const bucket = `${await digest(ip)}:${Math.floor(Date.now() / 900000)}`;
      await db()
        .prepare(
          'INSERT INTO login_attempts (id, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET attempts = attempts + 1',
        )
        .bind(bucket, Date.now() + 900000)
        .run();
      const rate = await db()
        .prepare('SELECT attempts FROM login_attempts WHERE id = ?')
        .bind(bucket)
        .first<{ attempts: number }>();
      if ((rate?.attempts ?? 0) > 20)
        throw new PortalError(
          'Too many sign-in attempts. Please try again in 15 minutes.',
          429,
        );
      const snapshot = await readState();
      const key =
        typeof action.key === 'string' ? action.key.trim().toUpperCase() : '';
      const submission = snapshot.state.submissions.find((s) => s.key === key);
      if (!submission)
        throw new PortalError(
          'We could not find that key. Check your invitation and try again.',
          401,
        );
      const token =
        crypto.randomUUID().replaceAll('-', '') +
        crypto.randomUUID().replaceAll('-', '');
      await db().batch([
        db()
          .prepare(
            'INSERT INTO presenter_sessions (token_hash, submission_id, expires_at) VALUES (?, ?, ?)',
          )
          .bind(await digest(token), submission.id, Date.now() + 43200000),
        db()
          .prepare('DELETE FROM presenter_sessions WHERE expires_at < ?')
          .bind(Date.now()),
        db()
          .prepare('DELETE FROM login_attempts WHERE expires_at < ?')
          .bind(Date.now()),
      ]);
      const actor = await identity(request);
      // A presenter sign-in response never exposes organizer records.
      return json(
        visibleData(snapshot, {
          ...actor,
          organizer: false,
          submissionId: submission.id,
        }),
        200,
        { 'Set-Cookie': cookie(token, 43200) },
      );
    }
    const actor = await identity(request);
    if (!actor.organizer && !actor.submissionId)
      throw new PortalError('Sign in to continue.', 401);
    return json(visibleData(await mutate(action, actor), actor));
  } catch (error) {
    return errorResponse(error);
  }
}
