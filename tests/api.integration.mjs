import assert from 'node:assert/strict';
const base = 'http://localhost:3000';
const req = async (action, cookie = '') => {
  const r = await fetch(base + '/api/portal', {
    method: action ? 'POST' : 'GET',
    headers: {
      ...(action ? { 'Content-Type': 'application/json', Origin: base } : {}),
      Cookie: cookie,
    },
    ...(action ? { body: JSON.stringify(action) } : {}),
  });
  return {
    status: r.status,
    body: await r.json(),
    cookie: r.headers.get('set-cookie')?.split(';')[0] ?? '',
  };
};
let admin = await req(null, '__sites_local_auth=1');
assert.equal(admin.body.organizer, true);
const anon = await req();
assert.deepEqual(anon.body.state.submissions, []);
assert.equal((await req({ kind: 'delete-block', id: 'anything' })).status, 401);
if (!admin.body.state.submissions.length)
  admin = await req(
    { kind: 'sample-data', revision: admin.body.revision },
    '__sites_local_auth=1',
  );
const key = admin.body.state.submissions[0].key;
const login = await req({ kind: 'login', key });
assert.equal(login.status, 200);
assert.equal(login.body.state.submissions.length, 1);
assert.equal(login.body.state.presenters.length, 1);
assert.equal(login.body.state.log.length, 0);
assert.equal(
  (await req({ kind: 'save-block', data: {} }, login.cookie)).status,
  403,
);
assert.equal(
  (await req({ kind: 'book', periodId: 'b-bio-paper__10-00' }, login.cookie))
    .status,
  400,
);
const contact = {
  name: 'API test presenter',
  email: 'concurrency-test@example.edu',
  institution: 'Test institute',
  title: 'Concurrent booking validation',
  track: 'AI and Systems',
  type: 'Paper',
  durationMinutes: 8,
};
admin = await req(null, '__sites_local_auth=1');
const create = await req(
  { kind: 'save-submission', data: contact, revision: admin.body.revision },
  '__sites_local_auth=1',
);
assert.equal(create.status, 200);
const second = create.body.state.submissions.find(
  (s) => s.title === contact.title,
);
const login2 = await req({ kind: 'login', key: second.key });
const result = await Promise.all([
  req({ kind: 'book', periodId: 'b-ai-paper__10-32' }, login.cookie),
  req({ kind: 'book', periodId: 'b-ai-paper__10-32' }, login2.cookie),
]);
assert.deepEqual(
  result.map((r) => r.status).sort((a, b) => a - b),
  [200, 400],
);
const persisted = await req(null, login.cookie);
assert.equal(persisted.body.state.submissions.length, 1);
const csrf = await fetch(base + '/api/portal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: 'https://untrusted.example',
    Cookie: login.cookie,
  },
  body: JSON.stringify({ kind: 'cancel' }),
});
assert.equal(csrf.status, 403);
admin = await req(null, '__sites_local_auth=1');
assert.equal(
  (
    await req(
      {
        kind: 'move-block',
        id: 'b-ai-paper',
        direction: 1,
        revision: admin.body.revision - 1,
      },
      '__sites_local_auth=1',
    )
  ).status,
  409,
);
await req({ kind: 'cancel' }, login.cookie);
admin = await req(null, '__sites_local_auth=1');
assert.equal(
  (
    await req(
      {
        kind: 'delete-submission',
        id: second.id,
        revision: admin.body.revision,
      },
      '__sites_local_auth=1',
    )
  ).status,
  200,
);
await req({ kind: 'logout' }, login.cookie);
assert.equal((await req(null, login.cookie)).body.submissionId, null);
console.log(
  'PASS: API authorization, scoped reads, eligibility, concurrent booking, persistence, CSRF, stale-write protection, logout.',
);
