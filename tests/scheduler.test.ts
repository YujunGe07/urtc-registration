import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, bookingIssue } from '../lib/scheduler-actions';
import { seedState, emptyState, makePeriods } from '../lib/scheduler';
const admin = {
  organizer: true,
  submissionId: null,
  email: 'test@example.edu',
};
const presenter = { organizer: false, submissionId: 's-201', email: '' };
const seed = () => structuredClone(seedState);
void test('presenter cannot edit conference records', () =>
  assert.throws(
    () =>
      applyAction(
        seed(),
        { kind: 'delete-block', id: 'b-ai-paper' },
        presenter,
      ),
    /Organizer access/,
  ));
void test('presenter cannot impersonate another submission', () => {
  const s = applyAction(
    seed(),
    { kind: 'help', id: 's-214', note: 'After noon' },
    presenter,
  );
  assert.equal(s.submissions[0].helpNote, 'After noon');
  assert.equal(s.submissions[1].helpNote, undefined);
});
void test('booking rejects wrong track, unknown slots, closed blocks', () => {
  for (const periodId of ['b-bio-paper__10-00', 'b-ai-paper__99-00'])
    assert.throws(() =>
      applyAction(seed(), { kind: 'book', periodId }, presenter),
    );
  const s = seed();
  s.blocks[0].locked = true;
  assert.throws(
    () =>
      applyAction(
        s,
        { kind: 'book', periodId: 'b-ai-paper__10-00' },
        presenter,
      ),
    /closed/,
  );
});
void test('full slot rejects the second booking', () => {
  const s = seed();
  s.submissions.push({
    ...s.submissions[0],
    id: 'occupied',
    assignedPeriodId: 'b-ai-paper__10-00',
    status: 'scheduled',
  });
  assert.throws(
    () =>
      applyAction(
        s,
        { kind: 'book', periodId: 'b-ai-paper__10-00' },
        presenter,
      ),
    /full/,
  );
});
void test('rescheduling frees previous slot and maintains one booking', () => {
  const booked = applyAction(
    seed(),
    { kind: 'book', periodId: 'b-ai-paper__10-00' },
    presenter,
  );
  const changed = applyAction(
    booked,
    { kind: 'book', periodId: 'b-ai-paper__10-08' },
    presenter,
  );
  assert.equal(changed.submissions[0].assignedPeriodId, 'b-ai-paper__10-08');
  assert.equal(
    changed.submissions.filter(
      (s) => s.assignedPeriodId === 'b-ai-paper__10-00',
    ).length,
    0,
  );
});
void test('help preserves a confirmed booking', () => {
  const s = seed();
  const next = applyAction(
    s,
    { kind: 'help', note: 'Need a later time' },
    { ...presenter, submissionId: 's-214' },
  );
  assert.equal(
    next.submissions[1].assignedPeriodId,
    s.submissions[1].assignedPeriodId,
  );
  assert.equal(next.submissions[1].status, 'needs help');
});
void test('block edit cannot invalidate booked slots', () => {
  const s = seed();
  assert.throws(
    () =>
      applyAction(
        s,
        {
          kind: 'save-block',
          id: 'b-bio-paper',
          data: { ...s.blocks[1], start: '11:00', end: '11:48' },
        },
        admin,
      ),
    /invalid booking/,
  );
  assert.throws(
    () => applyAction(s, { kind: 'delete-block', id: 'b-bio-paper' }, admin),
    /confirmed bookings/,
  );
});
void test('room overlaps are rejected', () => {
  const s = seed();
  assert.throws(
    () =>
      applyAction(
        s,
        { kind: 'save-block', data: { ...s.blocks[0], id: undefined } },
        admin,
      ),
    /already uses this room/,
  );
});
void test('block ranges, lengths, and capacities are validated', () => {
  for (const patch of [
    { presentationMinutes: 0 },
    { end: '09:00' },
    { capacityPerPeriod: 0 },
    { start: '' },
    { end: '10:49' },
    { date: '2027-02-30' },
  ])
    assert.throws(() =>
      applyAction(
        seed(),
        {
          kind: 'save-block',
          id: 'b-ai-paper',
          data: { ...seed().blocks[0], ...patch },
        },
        admin,
      ),
    );
});
void test('workshop slots fit the longer duration', () => {
  const block = seed().blocks.find((b) => b.type === 'Workshop')!;
  assert.equal(makePeriods(block).length, 2);
  assert.equal(block.presentationMinutes, 24);
});
void test('same email cannot have overlapping presentations', () => {
  const s = seed();
  s.presenters[0].email = s.presenters[1].email;
  assert.match(
    bookingIssue(s, s.submissions[0], 'b-ai-paper__10-16')!,
    /overlapping/,
  );
});
void test('random keys are unique and sample data cannot replace real records', () => {
  const a = applyAction(emptyState, { kind: 'sample-data' }, admin);
  const b = applyAction(emptyState, { kind: 'sample-data' }, admin);
  assert.notEqual(a.submissions[0].key, b.submissions[0].key);
  assert.throws(() => applyAction(a, { kind: 'sample-data' }, admin), /empty/);
});
void test('cancellation releases booking and validates identity', () => {
  const state = applyAction(
    seed(),
    { kind: 'cancel' },
    { ...presenter, submissionId: 's-214' },
  );
  assert.equal(state.submissions[1].assignedPeriodId, null);
  assert.throws(
    () =>
      applyAction(
        seed(),
        { kind: 'cancel' },
        { ...presenter, submissionId: null },
      ),
    /Sign in/,
  );
});
void test('locked submissions cannot be rescheduled by presenters', () => {
  const s = seed();
  s.submissions[0].locked = true;
  assert.throws(
    () =>
      applyAction(
        s,
        { kind: 'book', periodId: 'b-ai-paper__10-00' },
        presenter,
      ),
    /locked/,
  );
});
