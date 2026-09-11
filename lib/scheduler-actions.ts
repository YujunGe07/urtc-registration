import {
  type Block,
  type SchedulerState,
  type Submission,
  type Presenter,
  tracks,
  typeDurations,
  makePeriods,
  toMinutes,
  seedState,
} from './scheduler';

export class PortalError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function fail(message: string): never {
  throw new PortalError(message);
}
function string(value: unknown, label: string, max = 300, optional = false) {
  if (
    typeof value !== 'string' ||
    (!optional && !value.trim()) ||
    value.length > max
  )
    return fail(`${label} is required and must be ${max} characters or fewer.`);
  return value.trim();
}
function integer(value: unknown, label: string, min: number, max: number) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    return fail(`${label} must be a whole number from ${min} to ${max}.`);
  return value;
}
function email(value: unknown) {
  const result = string(value, 'Email', 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    return fail('Enter a valid email address.');
  return result;
}
function track(value: unknown) {
  if (!tracks.includes(value as Block['track']))
    return fail('Choose a valid track.');
  return value as Block['track'];
}
function format(value: unknown) {
  if (!Object.hasOwn(typeDurations, String(value)))
    return fail('Choose a valid presentation format.');
  return value as Block['type'];
}
function contact(input: Record<string, unknown>, id: string): Presenter {
  return {
    id,
    name: string(input.name, 'Presenter name', 150),
    email: email(input.email),
    institution: string(input.institution, 'Institution', 200),
    timezone: 'America/Los_Angeles',
  };
}
function parseBlock(input: Record<string, unknown>, id: string): Block {
  const date = string(input.date, 'Date', 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    return fail('Choose a valid session date.');
  const start = string(input.start, 'Start time', 5),
    end = string(input.end, 'End time', 5);
  if (![start, end].every((v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v)))
    return fail('Enter valid start and end times.');
  const presentationMinutes = integer(
    input.presentationMinutes,
    'Slot length',
    1,
    240,
  );
  if (toMinutes(end) - toMinutes(start) < presentationMinutes)
    return fail('The block must fit at least one complete presentation slot.');
  if ((toMinutes(end) - toMinutes(start)) % presentationMinutes !== 0)
    return fail('Block length must be a multiple of the slot length.');
  return {
    id,
    title: string(input.title, 'Block title'),
    track: track(input.track),
    type: format(input.type),
    date,
    start,
    end,
    room: string(input.room, 'Room', 150),
    capacityPerPeriod: integer(input.capacityPerPeriod, 'Capacity', 1, 100),
    presentationMinutes,
    chair: string(input.chair, 'Session chair', 150, true),
    locked: input.locked === true,
  };
}
export function bookingIssue(
  state: SchedulerState,
  submission: Submission,
  periodId: string,
) {
  const block = state.blocks.find((b) =>
    makePeriods(b).some((p) => p.id === periodId),
  );
  if (!block)
    return 'This slot no longer exists. Refresh the schedule and choose another.';
  if (block.track !== submission.track || block.type !== submission.type)
    return 'This slot does not match the submission track and format.';
  if (block.presentationMinutes < submission.durationMinutes)
    return 'This slot is too short for the presentation.';
  if (
    state.submissions.filter(
      (s) => s.id !== submission.id && s.assignedPeriodId === periodId,
    ).length >= block.capacityPerPeriod
  )
    return 'This slot is full. Choose another time.';
  const period = makePeriods(block).find((p) => p.id === periodId)!;
  const person = state.presenters.find((p) => p.id === submission.presenterId);
  const conflict = state.submissions.some((s) => {
    if (s.id === submission.id || !s.assignedPeriodId) return false;
    const otherPerson = state.presenters.find((p) => p.id === s.presenterId);
    if (
      s.presenterId !== submission.presenterId &&
      (!person ||
        person.email.toLowerCase() !== otherPerson?.email.toLowerCase())
    )
      return false;
    const otherBlock = state.blocks.find((b) =>
      makePeriods(b).some((p) => p.id === s.assignedPeriodId),
    );
    const other =
      otherBlock &&
      makePeriods(otherBlock).find((p) => p.id === s.assignedPeriodId);
    return (
      otherBlock?.date === block.date &&
      other &&
      period.start < other.end &&
      period.end > other.start
    );
  });
  return conflict
    ? 'This presenter already has an overlapping presentation.'
    : null;
}
function validateAssignments(state: SchedulerState) {
  for (const s of state.submissions)
    if (s.assignedPeriodId) {
      const issue = bookingIssue(state, s, s.assignedPeriodId);
      if (issue)
        fail(
          `Cannot save: ${s.title} would have an invalid booking. ${issue} Reschedule or cancel the booking first.`,
        );
    }
}
export function applyAction(
  current: SchedulerState,
  action: Record<string, unknown>,
  actor: { organizer: boolean; submissionId: string | null; email: string },
) {
  const state = structuredClone(current);
  const kind = action.kind;
  const data = (
    action.data && typeof action.data === 'object' ? action.data : {}
  ) as Record<string, unknown>;
  const organizerOnly = [
    'save-submission',
    'delete-submission',
    'save-block',
    'delete-block',
    'move-block',
    'lock-submission',
    'sample-data',
  ];
  if (organizerOnly.includes(String(kind)) && !actor.organizer)
    throw new PortalError('Organizer access is required.', 403);
  const sub = state.submissions.find(
    (s) =>
      s.id === (actor.organizer && action.id ? action.id : actor.submissionId),
  );
  let message = '';
  if (kind === 'save-submission') {
    const existing = state.submissions.find((s) => s.id === action.id);
    if (action.id && !existing)
      fail(
        'This submission was removed. Refresh the conference before continuing.',
      );
    const id = existing?.id ?? crypto.randomUUID();
    const presenter = contact(
      data,
      existing?.presenterId ?? crypto.randomUUID(),
    );
    const type = format(data.type);
    const submission: Submission = {
      id,
      presenterId: presenter.id,
      key:
        existing?.key ??
        `URTC-${crypto.randomUUID().replaceAll('-', '').toUpperCase()}`,
      title: string(data.title, 'Submission title', 400),
      type,
      track: track(data.track),
      durationMinutes: integer(
        data.durationMinutes ?? typeDurations[type],
        'Presentation duration',
        1,
        240,
      ),
      coauthors: string(data.coauthors ?? '', 'Coauthors', 1000, true),
      abstract: string(data.abstract ?? '', 'Abstract', 6000, true),
      avNeeds: string(data.avNeeds ?? '', 'AV needs', 1000, true),
      status: existing?.status ?? 'unscheduled',
      assignedPeriodId: existing?.assignedPeriodId ?? null,
      locked: existing?.locked ?? false,
      helpNote: existing?.helpNote,
    };
    state.presenters = [
      ...state.presenters.filter((p) => p.id !== presenter.id),
      presenter,
    ];
    state.submissions = existing
      ? state.submissions.map((s) => (s.id === id ? submission : s))
      : [...state.submissions, submission];
    validateAssignments(state);
    message = `${existing ? 'Updated' : 'Added'} submission: ${submission.title}`;
  } else if (kind === 'delete-submission') {
    if (!sub) fail('Submission not found.');
    state.submissions = state.submissions.filter((s) => s.id !== sub.id);
    state.presenters = state.presenters.filter(
      (p) =>
        p.id !== sub.presenterId ||
        state.submissions.some((s) => s.presenterId === p.id),
    );
    message = `Deleted submission: ${sub.title}`;
  } else if (kind === 'save-block') {
    const existing = state.blocks.find((b) => b.id === action.id);
    if (action.id && !existing)
      fail('This block was removed. Refresh the conference before continuing.');
    const block = parseBlock(data, existing?.id ?? `b-${crypto.randomUUID()}`);
    if (
      state.blocks.some(
        (b) =>
          b.id !== block.id &&
          b.date === block.date &&
          b.room.trim().toLowerCase() === block.room.toLowerCase() &&
          b.start < block.end &&
          b.end > block.start,
      )
    )
      fail('Another block already uses this room during that time.');
    state.blocks = existing
      ? state.blocks.map((b) => (b.id === block.id ? block : b))
      : [...state.blocks, block];
    validateAssignments(state);
    message = `${existing ? 'Updated' : 'Created'} block: ${block.title}`;
  } else if (kind === 'delete-block') {
    const block = state.blocks.find((b) => b.id === action.id);
    if (!block) fail('Block not found.');
    if (
      state.submissions.some((s) =>
        s.assignedPeriodId?.startsWith(`${block.id}__`),
      )
    )
      fail(
        'This block has confirmed bookings. Reschedule or cancel them before deleting it.',
      );
    state.blocks = state.blocks.filter((b) => b.id !== block.id);
    message = `Deleted block: ${block.title}`;
  } else if (kind === 'move-block') {
    const i = state.blocks.findIndex((b) => b.id === action.id),
      direction = action.direction === -1 ? -1 : 1;
    if (i < 0 || i + direction < 0 || i + direction >= state.blocks.length)
      fail('This block cannot move further.');
    [state.blocks[i], state.blocks[i + direction]] = [
      state.blocks[i + direction],
      state.blocks[i],
    ];
    message = 'Updated block order';
  } else if (kind === 'sample-data') {
    if (state.submissions.length || state.blocks.length)
      fail('Sample data can only be loaded into an empty conference.');
    const sample = structuredClone(seedState);
    sample.submissions.forEach((s) => {
      s.key = `URTC-${crypto.randomUUID().replaceAll('-', '').toUpperCase()}`;
    });
    sample.log = [];
    Object.assign(state, sample);
    message = 'Loaded sample conference records for review';
  } else if (
    ['book', 'cancel', 'help', 'update-contact', 'lock-submission'].includes(
      String(kind),
    )
  ) {
    if (!sub)
      throw new PortalError(
        'Sign in with your presenter key to continue.',
        401,
      );
    if (sub.locked && !actor.organizer && kind !== 'help')
      fail('Your booking is locked. Request help from an organizer.');
    if (kind === 'book') {
      const periodId = string(action.periodId, 'Slot', 100);
      const issue = bookingIssue(state, sub, periodId);
      if (issue) fail(issue);
      const block = state.blocks.find((b) =>
        makePeriods(b).some((p) => p.id === periodId),
      )!;
      if (block.locked) fail('Booking is closed for this block.');
      sub.assignedPeriodId = periodId;
      sub.status = 'scheduled';
      sub.helpNote = '';
      message = `Confirmed booking for ${sub.title}`;
    } else if (kind === 'cancel') {
      sub.assignedPeriodId = null;
      sub.status = sub.helpNote ? 'needs help' : 'unscheduled';
      message = `Cancelled booking for ${sub.title}`;
    } else if (kind === 'help') {
      sub.helpNote = string(action.note, 'Availability note', 2000);
      sub.status = 'needs help';
      message = `Scheduling help requested for ${sub.title}: ${sub.helpNote}`;
    } else if (kind === 'lock-submission') {
      sub.locked = !sub.locked;
      message = `${sub.locked ? 'Locked' : 'Unlocked'} booking for ${sub.title}`;
    } else {
      const person = contact(data, sub.presenterId);
      state.presenters = state.presenters.map((p) =>
        p.id === person.id ? person : p,
      );
      validateAssignments(state);
      message = `Updated presenter details for ${sub.title}`;
    }
  } else fail('Unknown action.');
  state.log = [
    {
      id: crypto.randomUUID(),
      time: new Date().toISOString(),
      actor: actor.organizer ? actor.email : 'Presenter',
      message,
    },
    ...state.log,
  ].slice(0, 200);
  return state;
}
