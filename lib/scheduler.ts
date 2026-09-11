export type PresentationType =
  | 'Paper'
  | 'Poster'
  | 'Lightning talk'
  | 'Workshop';
export type Track =
  | 'AI and Systems'
  | 'Bioengineering'
  | 'Circuits and Devices'
  | 'Climate and Energy'
  | 'Human-Centered Computing'
  | 'Robotics';

export type Presenter = {
  id: string;
  name: string;
  email: string;
  institution: string;
  timezone: string;
};

export type Submission = {
  id: string;
  key: string;
  title: string;
  type: PresentationType;
  track: Track;
  durationMinutes: number;
  presenterId: string;
  coauthors: string;
  abstract: string;
  avNeeds: string;
  status: 'unscheduled' | 'scheduled' | 'needs help';
  assignedPeriodId: string | null;
  locked: boolean;
  helpNote?: string;
};

export type Block = {
  id: string;
  title: string;
  track: Track;
  type: PresentationType;
  date: string;
  start: string;
  end: string;
  room: string;
  capacityPerPeriod: number;
  presentationMinutes: number;
  chair: string;
  locked?: boolean;
};

export type EventLog = {
  id: string;
  time: string;
  actor: string;
  message: string;
};

export type SchedulerState = {
  presenters: Presenter[];
  submissions: Submission[];
  blocks: Block[];
  log: EventLog[];
};

export type Draft = {
  title: string;
  name: string;
  email: string;
  institution: string;
  type: PresentationType;
  track: Track;
  avNeeds: string;
};

export const tracks: Track[] = [
  'AI and Systems',
  'Bioengineering',
  'Circuits and Devices',
  'Climate and Energy',
  'Human-Centered Computing',
  'Robotics',
];

export const typeDurations: Record<PresentationType, number> = {
  Paper: 8,
  Poster: 8,
  'Lightning talk': 8,
  Workshop: 24,
};

export const seedState: SchedulerState = {
  presenters: [
    {
      id: 'p-maya',
      name: 'Maya Patel',
      email: 'maya.patel@example.edu',
      institution: 'UC Berkeley',
      timezone: 'America/Los_Angeles',
    },
    {
      id: 'p-daniel',
      name: 'Daniel Kim',
      email: 'daniel.kim@example.edu',
      institution: 'University of Washington',
      timezone: 'America/Los_Angeles',
    },
    {
      id: 'p-sofia',
      name: 'Sofia Chen',
      email: 'sofia.chen@example.edu',
      institution: 'Host University',
      timezone: 'America/Los_Angeles',
    },
    {
      id: 'p-andre',
      name: 'Andre Williams',
      email: 'andre.williams@example.edu',
      institution: 'Harvey Mudd College',
      timezone: 'America/Los_Angeles',
    },
  ],
  submissions: [
    {
      id: 's-201',
      key: 'URTC-AI-201',
      title: 'Edge Scheduling for Low-Power Vision Models',
      type: 'Paper',
      track: 'AI and Systems',
      durationMinutes: 8,
      presenterId: 'p-maya',
      coauthors: 'A. Singh, L. Torres',
      abstract:
        'A compact scheduler for running vision models on energy-constrained edge devices.',
      avNeeds: 'Projector, HDMI',
      status: 'unscheduled',
      assignedPeriodId: null,
      locked: false,
    },
    {
      id: 's-214',
      key: 'URTC-BIO-214',
      title: 'Adaptive Microfluidics for Rapid Cell Sorting',
      type: 'Paper',
      track: 'Bioengineering',
      durationMinutes: 8,
      presenterId: 'p-daniel',
      coauthors: 'J. Lee',
      abstract:
        'A low-cost microfluidic control approach for undergraduate wet-lab platforms.',
      avNeeds: 'Audio for short clip',
      status: 'scheduled',
      assignedPeriodId: 'b-bio-paper__10-16',
      locked: false,
    },
    {
      id: 's-226',
      key: 'URTC-CIRC-226',
      title: 'Thermal-Aware Routing in Student-Built Satellites',
      type: 'Poster',
      track: 'Circuits and Devices',
      durationMinutes: 8,
      presenterId: 'p-sofia',
      coauthors: 'M. Ortiz, H. Nguyen',
      abstract:
        'Poster describing routing choices in a small satellite thermal-control stack.',
      avNeeds: 'Poster board',
      status: 'unscheduled',
      assignedPeriodId: null,
      locked: false,
    },
    {
      id: 's-230',
      key: 'URTC-CLIMATE-230',
      title: 'Community Grid Forecasting After Wildfire Events',
      type: 'Lightning talk',
      track: 'Climate and Energy',
      durationMinutes: 8,
      presenterId: 'p-andre',
      coauthors: 'R. Thompson',
      abstract:
        'A short talk on wildfire-aware grid load forecasting for community resilience.',
      avNeeds: 'One-slide deck',
      status: 'needs help',
      assignedPeriodId: null,
      locked: false,
    },
  ],
  blocks: [
    {
      id: 'b-ai-paper',
      title: 'AI and Systems paper block',
      track: 'AI and Systems',
      type: 'Paper',
      date: '2027-05-15',
      start: '10:00',
      end: '10:48',
      room: 'Packard 101',
      capacityPerPeriod: 1,
      presentationMinutes: 8,
      chair: 'Gim Soon Wan',
    },
    {
      id: 'b-bio-paper',
      title: 'Bioengineering paper block',
      track: 'Bioengineering',
      type: 'Paper',
      date: '2027-05-15',
      start: '10:00',
      end: '10:48',
      room: 'Packard 202',
      capacityPerPeriod: 1,
      presentationMinutes: 8,
      chair: 'Session chair TBD',
    },
    {
      id: 'b-circuits-poster',
      title: 'Circuits and Devices poster check-in',
      track: 'Circuits and Devices',
      type: 'Poster',
      date: '2027-05-16',
      start: '09:30',
      end: '10:34',
      room: 'Packard Atrium',
      capacityPerPeriod: 4,
      presentationMinutes: 8,
      chair: 'Poster lead TBD',
    },
    {
      id: 'b-climate-lightning',
      title: 'Climate and Energy lightning sequence',
      track: 'Climate and Energy',
      type: 'Lightning talk',
      date: '2027-05-16',
      start: '11:00',
      end: '11:48',
      room: 'Packard 101',
      capacityPerPeriod: 1,
      presentationMinutes: 8,
      chair: 'Lightning chair TBD',
    },
    {
      id: 'b-hci-workshop',
      title: 'Human-Centered Computing workshop demos',
      track: 'Human-Centered Computing',
      type: 'Workshop',
      date: '2027-05-16',
      start: '12:00',
      end: '12:48',
      room: 'Packard 202',
      capacityPerPeriod: 1,
      presentationMinutes: 24,
      chair: 'Workshop chair TBD',
    },
    {
      id: 'b-robotics-paper',
      title: 'Robotics paper block',
      track: 'Robotics',
      type: 'Paper',
      date: '2027-05-15',
      start: '11:00',
      end: '11:48',
      room: 'Packard 101',
      capacityPerPeriod: 1,
      presentationMinutes: 8,
      chair: 'Robotics chair TBD',
    },
  ],
  log: [
    {
      id: 'log-1',
      time: '2026-09-10T09:00:00.000Z',
      actor: 'System',
      message:
        'Demo data loaded with four accepted submissions and six track blocks.',
    },
  ],
};

export function toMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function toTime(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(`${date}T12:00:00-07:00`));
}

export function makePeriods(block: Block) {
  const periods = [];
  const length = block.presentationMinutes;
  if (!Number.isInteger(length) || length < 1 || length > 240) return [];
  for (
    let start = toMinutes(block.start);
    start + length <= toMinutes(block.end);
    start += length
  ) {
    periods.push({
      id: `${block.id}__${toTime(start).replace(':', '-')}`,
      blockId: block.id,
      start: toTime(start),
      end: toTime(start + length),
    });
  }
  return periods;
}

export function presenterFor(
  state: SchedulerState,
  submission: Submission | null,
) {
  if (!submission) return null;
  return (
    state.presenters.find(
      (presenter) => presenter.id === submission.presenterId,
    ) ?? null
  );
}

export function blockForPeriod(state: SchedulerState, periodId: string | null) {
  if (!periodId) return null;
  const blockId = periodId.split('__')[0];
  return state.blocks.find((block) => block.id === blockId) ?? null;
}

export function periodLabel(state: SchedulerState, periodId: string | null) {
  const block = blockForPeriod(state, periodId);
  if (!block || !periodId) return 'Not booked';
  const period = makePeriods(block).find((item) => item.id === periodId);
  if (!period) return 'Not booked';
  return `${formatDate(block.date)}, ${period.start}-${period.end} PT in ${block.room}`;
}

export function countAssigned(
  state: SchedulerState,
  periodId: string,
  exceptSubmissionId?: string,
) {
  return state.submissions.filter(
    (submission) =>
      submission.assignedPeriodId === periodId &&
      submission.id !== exceptSubmissionId,
  ).length;
}

export const emptyState: SchedulerState = {
  presenters: [],
  submissions: [],
  blocks: [],
  log: [],
};
export type PortalData = {
  state: SchedulerState;
  revision: number;
  organizer: boolean;
  signedIn: boolean;
  email: string;
  submissionId: string | null;
  occupancy: Record<string, number>;
};
