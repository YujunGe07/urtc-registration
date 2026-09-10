'use client';

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  KeyRound,
  Layers3,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

type Role = 'home' | 'presenter' | 'organizer';
type PresenterStep = 'key' | 'review' | 'book' | 'done';
type OrganizerView = 'overview' | 'intake' | 'blocks' | 'schedule';
type PresentationType = 'Paper' | 'Poster' | 'Lightning talk' | 'Workshop';
type Track =
  | 'AI and Systems'
  | 'Bioengineering'
  | 'Circuits and Devices'
  | 'Climate and Energy'
  | 'Human-Centered Computing'
  | 'Robotics';

type Presenter = {
  id: string;
  name: string;
  email: string;
  institution: string;
  timezone: string;
  arrival: string;
  departure: string;
};

type Submission = {
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
};

type Block = {
  id: string;
  title: string;
  track: Track;
  type: PresentationType;
  date: '2027-05-15' | '2027-05-16';
  start: string;
  end: string;
  room: string;
  capacityPerPeriod: number;
  chair: string;
  locked?: boolean;
};

type EventLog = {
  id: string;
  time: string;
  actor: string;
  message: string;
};

type SchedulerState = {
  presenters: Presenter[];
  submissions: Submission[];
  blocks: Block[];
  log: EventLog[];
};

type Draft = {
  title: string;
  name: string;
  email: string;
  institution: string;
  type: PresentationType;
  track: Track;
  avNeeds: string;
};

const tracks: Track[] = [
  'AI and Systems',
  'Bioengineering',
  'Circuits and Devices',
  'Climate and Energy',
  'Human-Centered Computing',
  'Robotics',
];

const typeDurations: Record<PresentationType, number> = {
  Paper: 8,
  Poster: 8,
  'Lightning talk': 8,
  Workshop: 24,
};

const seedState: SchedulerState = {
  presenters: [
    {
      id: 'p-maya',
      name: 'Maya Patel',
      email: 'maya.patel@example.edu',
      institution: 'UC Berkeley',
      timezone: 'America/Los_Angeles',
      arrival: 'Saturday morning',
      departure: 'Sunday afternoon',
    },
    {
      id: 'p-daniel',
      name: 'Daniel Kim',
      email: 'daniel.kim@example.edu',
      institution: 'University of Washington',
      timezone: 'America/Los_Angeles',
      arrival: 'Saturday morning',
      departure: 'Sunday noon',
    },
    {
      id: 'p-sofia',
      name: 'Sofia Chen',
      email: 'sofia.chen@example.edu',
      institution: 'Stanford University',
      timezone: 'America/Los_Angeles',
      arrival: 'Friday afternoon',
      departure: 'Sunday afternoon',
    },
    {
      id: 'p-andre',
      name: 'Andre Williams',
      email: 'andre.williams@example.edu',
      institution: 'Harvey Mudd College',
      timezone: 'America/Los_Angeles',
      arrival: 'Friday evening',
      departure: 'Sunday morning',
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
      abstract: 'A compact scheduler for running vision models on energy-constrained edge devices.',
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
      abstract: 'A low-cost microfluidic control approach for undergraduate wet-lab platforms.',
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
      abstract: 'Poster describing routing choices in a small satellite thermal-control stack.',
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
      abstract: 'A short talk on wildfire-aware grid load forecasting for community resilience.',
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
      chair: 'Robotics chair TBD',
    },
  ],
  log: [
    {
      id: 'log-1',
      time: '2026-09-10T09:00:00.000Z',
      actor: 'System',
      message: 'Demo data loaded with four accepted submissions and six track blocks.',
    },
  ],
};

const blankDraft: Draft = {
  title: '',
  name: '',
  email: '',
  institution: '',
  type: 'Paper',
  track: 'AI and Systems',
  avNeeds: '',
};

const storageKey = 'stanford-urtc-redesigned-scheduler';

function toMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function toTime(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(`${date}T12:00:00-07:00`));
}

function makePeriods(block: Block) {
  const periods = [];
  for (let start = toMinutes(block.start); start + 8 <= toMinutes(block.end); start += 8) {
    periods.push({
      id: `${block.id}__${toTime(start).replace(':', '-')}`,
      blockId: block.id,
      start: toTime(start),
      end: toTime(start + 8),
    });
  }
  return periods;
}

function presenterFor(state: SchedulerState, submission: Submission | null) {
  if (!submission) return null;
  return state.presenters.find((presenter) => presenter.id === submission.presenterId) ?? null;
}

function blockForPeriod(state: SchedulerState, periodId: string | null) {
  if (!periodId) return null;
  const blockId = periodId.split('__')[0];
  return state.blocks.find((block) => block.id === blockId) ?? null;
}

function periodLabel(state: SchedulerState, periodId: string | null) {
  const block = blockForPeriod(state, periodId);
  if (!block || !periodId) return 'Not booked';
  const period = makePeriods(block).find((item) => item.id === periodId);
  if (!period) return 'Not booked';
  return `${formatDate(block.date)}, ${period.start}-${period.end} PT in ${block.room}`;
}

function countAssigned(state: SchedulerState, periodId: string, exceptSubmissionId?: string) {
  return state.submissions.filter(
    (submission) =>
      submission.assignedPeriodId === periodId && submission.id !== exceptSubmissionId,
  ).length;
}

function keyify(input: string) {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 28);
}

function log(actor: string, message: string): EventLog {
  return {
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    actor,
    message,
  };
}

function exportCsv(state: SchedulerState) {
  const rows = state.submissions.map((submission) => {
    const presenter = presenterFor(state, submission);
    const block = blockForPeriod(state, submission.assignedPeriodId);
    return {
      key: submission.key,
      title: submission.title,
      presenter: presenter?.name ?? '',
      email: presenter?.email ?? '',
      institution: presenter?.institution ?? '',
      type: submission.type,
      track: submission.track,
      status: submission.status,
      booking: periodLabel(state, submission.assignedPeriodId),
      room: block?.room ?? '',
      av: submission.avNeeds,
    };
  });
  const headers = Object.keys(rows[0]);
  return [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header as keyof typeof row]).replaceAll('"', '""')}"`)
        .join(','),
    ),
  ].join('\n');
}

function download(filename: string, body: string, type = 'text/csv') {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [state, setState] = useState(seedState);
  const [role, setRole] = useState<Role>('home');
  const [step, setStep] = useState<PresenterStep>('key');
  const [organizerView, setOrganizerView] = useState<OrganizerView>('overview');
  const [keyInput, setKeyInput] = useState('URTC-AI-201');
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [message, setMessage] = useState('Choose a workspace to begin.');
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setState(JSON.parse(saved));
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');
    if (key) {
      setKeyInput(key);
      const match = seedState.submissions.find((submission) => submission.key === key);
      setActiveSubmissionId(match?.id ?? null);
      setRole('presenter');
      setStep(match ? 'review' : 'key');
    }
    if (params.get('role') === 'organizer') {
      setRole('organizer');
      setOrganizerView('overview');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  const activeSubmission =
    state.submissions.find((submission) => submission.id === activeSubmissionId) ?? null;
  const activePresenter = presenterFor(state, activeSubmission);
  const activeBlock = blockForPeriod(state, activeSubmission?.assignedPeriodId ?? null);
  const eligibleBlocks = useMemo(() => {
    if (!activeSubmission) return [];
    return state.blocks.filter(
      (block) => block.track === activeSubmission.track && block.type === activeSubmission.type,
    );
  }, [activeSubmission, state.blocks]);

  const filteredSubmissions = state.submissions.filter((submission) => {
    const presenter = presenterFor(state, submission);
    return `${submission.key} ${submission.title} ${submission.track} ${presenter?.name ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const scheduledCount = state.submissions.filter((submission) => submission.status === 'scheduled').length;
  const periodCount = state.blocks.reduce((sum, block) => sum + makePeriods(block).length, 0);
  const totalSeats = state.blocks.reduce(
    (sum, block) => sum + makePeriods(block).length * block.capacityPerPeriod,
    0,
  );
  const usedSeats = state.submissions.filter((submission) => submission.assignedPeriodId).length;

  function navigate(nextRole: Role) {
    setRole(nextRole);
    if (nextRole === 'home') {
      window.history.replaceState(null, '', window.location.pathname);
      setMessage('Choose a workspace to begin.');
    }
    if (nextRole === 'presenter') {
      window.history.replaceState(null, '', '?role=presenter');
      setStep('key');
      setMessage('Enter the unique key from your acceptance email.');
    }
    if (nextRole === 'organizer') {
      window.history.replaceState(null, '', '?role=organizer');
      setOrganizerView('overview');
      setMessage('Organizer workspace opened. Sign-in will gate this area later.');
    }
  }

  function signInPresenter() {
    const key = keyInput.trim().toUpperCase();
    const match = state.submissions.find((submission) => submission.key === key);
    if (!match) {
      setMessage('That key does not match a demo accepted submission.');
      return;
    }
    setActiveSubmissionId(match.id);
    setStep('review');
    window.history.replaceState(null, '', `?key=${key}`);
    setMessage('Submission loaded. Check that the auto-filled information is correct.');
  }

  function updatePresenter(field: keyof Presenter, value: string) {
    if (!activePresenter) return;
    setState((current) => ({
      ...current,
      presenters: current.presenters.map((presenter) =>
        presenter.id === activePresenter.id ? { ...presenter, [field]: value } : presenter,
      ),
    }));
  }

  function requestHelp() {
    if (!activeSubmission || !activePresenter) return;
    setState((current) => ({
      ...current,
      submissions: current.submissions.map((submission) =>
        submission.id === activeSubmission.id
          ? { ...submission, status: 'needs help', assignedPeriodId: null }
          : submission,
      ),
      log: [
        log(activePresenter.name, `${activeSubmission.key} reported no workable 8-minute period.`),
        ...current.log,
      ],
    }));
    setMessage('Organizers will follow up about your availability.');
  }

  function book(periodId: string) {
    if (!activeSubmission || !activePresenter) return;
    const block = blockForPeriod(state, periodId);
    if (!block) return;
    const occupied = countAssigned(state, periodId, activeSubmission.id);
    if (occupied >= block.capacityPerPeriod) {
      setMessage('That 8-minute period was just filled. Please choose another one.');
      return;
    }
    if (activeSubmission.locked || block.locked) {
      setMessage('This assignment is locked. Please contact organizers.');
      return;
    }
    setState((current) => ({
      ...current,
      submissions: current.submissions.map((submission) =>
        submission.id === activeSubmission.id
          ? { ...submission, assignedPeriodId: periodId, status: 'scheduled' }
          : submission,
      ),
      log: [
        log(activePresenter.name, `${activeSubmission.key} booked ${periodLabel(current, periodId)}.`),
        ...current.log,
      ],
    }));
    setStep('done');
    setMessage('Booking confirmed.');
  }

  function registerSubmission() {
    if (!draft.title || !draft.name || !draft.email) {
      setMessage('Title, presenter name, and email are required.');
      return;
    }
    const presenterId = crypto.randomUUID();
    const key = `URTC-${keyify(draft.track.split(' ')[0])}-${Math.floor(100 + Math.random() * 900)}`;
    const submission: Submission = {
      id: crypto.randomUUID(),
      key,
      title: draft.title,
      type: draft.type,
      track: draft.track,
      durationMinutes: typeDurations[draft.type],
      presenterId,
      coauthors: 'To be confirmed by presenter',
      abstract: 'Imported accepted submission. Presenter will verify details after sign-in.',
      avNeeds: draft.avNeeds || 'Not specified',
      status: 'unscheduled',
      assignedPeriodId: null,
      locked: false,
    };
    setState((current) => ({
      ...current,
      presenters: [
        ...current.presenters,
        {
          id: presenterId,
          name: draft.name,
          email: draft.email,
          institution: draft.institution,
          timezone: 'America/Los_Angeles',
          arrival: 'Not provided',
          departure: 'Not provided',
        },
      ],
      submissions: [...current.submissions, submission],
      log: [log('Organizer', `${key} registered and ready for presenter sign-in.`), ...current.log],
    }));
    setDraft(blankDraft);
    setKeyInput(key);
    setMessage(`New unique key generated: ${key}`);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {role === 'home' ? (
        <Hero onPresenter={() => navigate('presenter')} onOrganizer={() => navigate('organizer')} />
      ) : (
        <WorkspaceShell
          role={role}
          message={message}
          onHome={() => navigate('home')}
          onReset={() => {
            setState(seedState);
            setActiveSubmissionId(null);
            setStep('key');
            setMessage('Demo data reset.');
          }}
        >
          {role === 'presenter' ? (
            <PresenterWorkspace
              step={step}
              keyInput={keyInput}
              setKeyInput={setKeyInput}
              signIn={signInPresenter}
              submissions={state.submissions}
              activeSubmission={activeSubmission}
              activePresenter={activePresenter}
              activeBlock={activeBlock}
              eligibleBlocks={eligibleBlocks}
              state={state}
              updatePresenter={updatePresenter}
              setStep={setStep}
              book={book}
              requestHelp={requestHelp}
            />
          ) : (
            <OrganizerWorkspace
              view={organizerView}
              setView={setOrganizerView}
              state={state}
              scheduledCount={scheduledCount}
              usedSeats={usedSeats}
              totalSeats={totalSeats}
              periodCount={periodCount}
              draft={draft}
              setDraft={setDraft}
              registerSubmission={registerSubmission}
              search={search}
              setSearch={setSearch}
              filteredSubmissions={filteredSubmissions}
              onExport={() => download('stanford-urtc-schedule.csv', exportCsv(state))}
            />
          )}
        </WorkspaceShell>
      )}
    </main>
  );
}

function Hero({
  onPresenter,
  onOrganizer,
}: {
  onPresenter: () => void;
  onOrganizer: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-5 text-primary" />
          Stanford URTC Scheduler
        </div>
        <Badge variant="outline">May 14-16, 2027</Badge>
      </nav>
      <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <div>
          <Badge className="bg-primary text-primary-foreground">Conference scheduling portal</Badge>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            One front door. Two completely separate workspaces.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Accepted presenters use their unique key to verify auto-filled submission details and book an exact 8-minute period inside their track block. Organizers manage accepted submissions, generated keys, blocks, capacities, and exports in a separate workspace.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              onClick={onPresenter}
              className="group rounded-lg border border-primary bg-primary p-5 text-left text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <UserPlus className="size-6" />
              <p className="mt-4 text-lg font-semibold">I am a presenter</p>
              <p className="mt-2 text-sm leading-6 text-primary-foreground/80">
                Sign in with a unique key, verify your paper/poster/talk details, then choose a specific 8-minute period.
              </p>
            </button>
            <button
              onClick={onOrganizer}
              className="group rounded-lg border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg"
            >
              <UserCog className="size-6 text-primary" />
              <p className="mt-4 text-lg font-semibold">I am an organizer</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Register accepted submissions, control track blocks, monitor bookings, and export the final schedule.
              </p>
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="text-sm font-semibold">Sequence map</p>
              <p className="text-xs text-muted-foreground">The intended UX, end to end</p>
            </div>
            <Sparkles className="size-5 text-primary" />
          </div>
          <div className="mt-5 space-y-4">
            {[
              ['1', 'Choose role', 'Presenter and organizer paths split immediately.'],
              ['2', 'Future sign-in', 'Each role gets its own authentication gate.'],
              ['3', 'Verify data', 'Presenter sees auto-filled accepted-submission stats.'],
              ['4', 'Book exact period', 'Only matching track blocks and available 8-minute periods appear.'],
            ].map(([number, title, text]) => (
              <div key={number} className="grid grid-cols-[36px_1fr] gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                  {number}
                </div>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function WorkspaceShell({
  role,
  message,
  onHome,
  onReset,
  children,
}: {
  role: Exclude<Role, 'home'>;
  message: string;
  onHome: () => void;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <button
              onClick={onHome}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Main intro
            </button>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {role === 'presenter' ? 'Presenter workspace' : 'Organizer workspace'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {role === 'presenter'
                ? 'Future sign-in: unique key, email verification, or presenter account.'
                : 'Future sign-in: Stanford, IEEE, or approved conference-admin account.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              {message}
            </div>
            <Button variant="outline" onClick={onReset}>
              Reset demo
            </Button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</section>
    </>
  );
}

function PresenterWorkspace(props: {
  step: PresenterStep;
  keyInput: string;
  setKeyInput: (value: string) => void;
  signIn: () => void;
  submissions: Submission[];
  activeSubmission: Submission | null;
  activePresenter: Presenter | null;
  activeBlock: Block | null;
  eligibleBlocks: Block[];
  state: SchedulerState;
  updatePresenter: (field: keyof Presenter, value: string) => void;
  setStep: (step: PresenterStep) => void;
  book: (periodId: string) => void;
  requestHelp: () => void;
}) {
  const steps: [PresenterStep, string][] = [
    ['key', 'Sign in'],
    ['review', 'Check details'],
    ['book', 'Choose period'],
    ['done', 'Confirmed'],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Panel>
          <p className="text-sm font-semibold">Presenter sequence</p>
          <div className="mt-4 space-y-2">
            {steps.map(([id, label], index) => (
              <div
                key={id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  props.step === id ? 'border-primary bg-primary/5' : 'border-border bg-background'
                }`}
              >
                <span className="flex size-7 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelTitle icon={<KeyRound />}>Demo keys</PanelTitle>
          <div className="mt-3 space-y-2">
            {props.submissions.map((submission) => (
              <button
                key={submission.id}
                onClick={() => props.setKeyInput(submission.key)}
                className="w-full rounded-lg border border-border bg-background p-3 text-left text-xs font-mono hover:border-primary"
              >
                {submission.key}
              </button>
            ))}
          </div>
        </Panel>
      </aside>

      <div className="space-y-5">
        {props.step === 'key' ? (
          <Panel className="min-h-[520px]">
            <div className="mx-auto flex max-w-xl flex-col justify-center py-10">
              <LockKeyhole className="size-10 text-primary" />
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">Enter your unique key</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                In production, this page will be reached from an email invitation. The key loads only the accepted submission attached to that presenter.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Input
                  value={props.keyInput}
                  onChange={(event) => props.setKeyInput(event.target.value)}
                  className="font-mono"
                  placeholder="URTC-AI-201"
                />
                <Button onClick={props.signIn}>Continue</Button>
              </div>
            </div>
          </Panel>
        ) : null}

        {props.step === 'review' && props.activeSubmission && props.activePresenter ? (
          <Panel>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <Badge variant="outline">{props.activeSubmission.key}</Badge>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  {props.activeSubmission.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Auto-filled from the accepted-submission record. The presenter checks this before scheduling.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Stat label="Type" value={props.activeSubmission.type} />
                  <Stat label="Track" value={props.activeSubmission.track} />
                  <Stat label="Period length" value={`${props.activeSubmission.durationMinutes} min`} />
                </div>
                <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Abstract</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {props.activeSubmission.abstract}
                  </p>
                </div>
              </div>
              <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-semibold">Presenter details</p>
                <Input value={props.activePresenter.name} onChange={(event) => props.updatePresenter('name', event.target.value)} />
                <Input value={props.activePresenter.email} onChange={(event) => props.updatePresenter('email', event.target.value)} />
                <Input value={props.activePresenter.institution} onChange={(event) => props.updatePresenter('institution', event.target.value)} />
                <Input value={props.activePresenter.arrival} onChange={(event) => props.updatePresenter('arrival', event.target.value)} />
                <Input value={props.activePresenter.departure} onChange={(event) => props.updatePresenter('departure', event.target.value)} />
                <Button className="w-full" onClick={() => props.setStep('book')}>
                  Details are correct
                </Button>
              </div>
            </div>
          </Panel>
        ) : null}

        {props.step === 'book' && props.activeSubmission ? (
          <Panel>
            <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 lg:flex-row lg:items-end">
              <div>
                <PanelTitle icon={<CalendarDays />}>Choose an available 8-minute period</PanelTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Only blocks matching {props.activeSubmission.track} and {props.activeSubmission.type} are shown.
                </p>
              </div>
              <Button variant="outline" onClick={props.requestHelp}>
                None of these work
              </Button>
            </div>
            <div className="mt-5 space-y-4">
              {props.eligibleBlocks.length === 0 ? (
                <EmptyState text="No matching track block has been created yet." />
              ) : (
                props.eligibleBlocks.map((block) => (
                  <TrackBlock
                    key={block.id}
                    block={block}
                    state={props.state}
                    activeSubmission={props.activeSubmission}
                    book={props.book}
                  />
                ))
              )}
            </div>
          </Panel>
        ) : null}

        {props.step === 'done' && props.activeSubmission ? (
          <Panel>
            <div className="mx-auto max-w-2xl py-8 text-center">
              <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">Your period is booked</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {periodLabel(props.state, props.activeSubmission.assignedPeriodId)}
              </p>
              <Button className="mt-6" variant="outline" onClick={() => props.setStep('book')}>
                Change selection
              </Button>
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function TrackBlock({
  block,
  state,
  activeSubmission,
  book,
}: {
  block: Block;
  state: SchedulerState;
  activeSubmission: Submission;
  book: (periodId: string) => void;
}) {
  const periods = makePeriods(block);
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">{block.track}</Badge>
            <Badge variant="outline">{block.type}</Badge>
          </div>
          <h3 className="mt-2 text-lg font-semibold">{block.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(block.date)}, {block.start}-{block.end} PT - {block.room} - {block.chair}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {periods.length} periods, {block.capacityPerPeriod} seat each
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {periods.map((period) => {
          const used = countAssigned(state, period.id, activeSubmission.id);
          const full = used >= block.capacityPerPeriod;
          const selected = activeSubmission.assignedPeriodId === period.id;
          return (
            <button
              key={period.id}
              disabled={full || block.locked || activeSubmission.locked}
              onClick={() => book(period.id)}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : full
                    ? 'border-border bg-muted text-muted-foreground'
                    : 'border-border bg-card hover:border-primary hover:bg-primary/5'
              }`}
            >
              <p className="text-sm font-semibold">{period.start}</p>
              <p className="mt-1 text-xs">{period.end} PT</p>
              <p className="mt-2 text-xs">
                {selected ? 'Selected' : full ? 'Full' : `${block.capacityPerPeriod - used} open`}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function OrganizerWorkspace(props: {
  view: OrganizerView;
  setView: (view: OrganizerView) => void;
  state: SchedulerState;
  scheduledCount: number;
  usedSeats: number;
  totalSeats: number;
  periodCount: number;
  draft: Draft;
  setDraft: (draft: Draft) => void;
  registerSubmission: () => void;
  search: string;
  setSearch: (value: string) => void;
  filteredSubmissions: Submission[];
  onExport: () => void;
}) {
  const nav: [OrganizerView, string, React.ReactNode][] = [
    ['overview', 'Overview', <LayoutDashboard key="overview" />],
    ['intake', 'Register', <UserPlus key="intake" />],
    ['blocks', 'Track blocks', <Layers3 key="blocks" />],
    ['schedule', 'Schedule', <CalendarDays key="schedule" />],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Panel>
          <PanelTitle icon={<LockKeyhole />}>Staff sign-in</PanelTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Placeholder for Stanford, IEEE, or conference-admin login.
          </p>
          <Button className="mt-4 w-full" variant="outline">
            Future staff login
          </Button>
        </Panel>
        <Panel className="p-2 sm:p-2">
          {nav.map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => props.setView(id)}
              className={`mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                props.view === id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="[&_svg]:size-4">{icon}</span>
              {label}
            </button>
          ))}
        </Panel>
      </aside>

      <div className="space-y-5">
        {props.view === 'overview' ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Accepted submissions" value={String(props.state.submissions.length)} icon={<FileText />} />
              <Metric label="Scheduled" value={`${props.scheduledCount}/${props.state.submissions.length}`} icon={<CheckCircle2 />} />
              <Metric label="8-min periods" value={String(props.periodCount)} icon={<Clock3 />} />
              <Metric label="Seats used" value={`${props.usedSeats}/${props.totalSeats}`} icon={<Users />} />
            </div>
            <Panel>
              <PanelTitle icon={<Sparkles />}>What organizers control</PanelTitle>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Info title="Accepted data" text="Import or register accepted papers, posters, and lightning talks before presenters sign in." />
                <Info title="Track blocks" text="Each track owns one or more blocks. Presenters only see blocks matching their track and type." />
                <Info title="8-minute periods" text="Blocks automatically generate bookable 8-minute periods with capacity rules." />
              </div>
            </Panel>
          </>
        ) : null}

        {props.view === 'intake' ? (
          <Panel>
            <PanelTitle icon={<UserPlus />}>Register accepted submission</PanelTitle>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input placeholder="Title" value={props.draft.title} onChange={(event) => props.setDraft({ ...props.draft, title: event.target.value })} />
              <Input placeholder="Presenter name" value={props.draft.name} onChange={(event) => props.setDraft({ ...props.draft, name: event.target.value })} />
              <Input placeholder="Presenter email" value={props.draft.email} onChange={(event) => props.setDraft({ ...props.draft, email: event.target.value })} />
              <Input placeholder="Institution" value={props.draft.institution} onChange={(event) => props.setDraft({ ...props.draft, institution: event.target.value })} />
              <NativeSelect value={props.draft.type} onChange={(event) => props.setDraft({ ...props.draft, type: event.target.value as PresentationType })}>
                {Object.keys(typeDurations).map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={props.draft.track} onChange={(event) => props.setDraft({ ...props.draft, track: event.target.value as Track })}>
                {tracks.map((track) => (
                  <option key={track}>{track}</option>
                ))}
              </NativeSelect>
              <Textarea
                className="md:col-span-2"
                placeholder="AV, accessibility, or scheduling notes"
                value={props.draft.avNeeds}
                onChange={(event) => props.setDraft({ ...props.draft, avNeeds: event.target.value })}
              />
            </div>
            <Button className="mt-5" onClick={props.registerSubmission}>
              Generate unique key
            </Button>
          </Panel>
        ) : null}

        {props.view === 'blocks' ? (
          <Panel>
            <PanelTitle icon={<Layers3 />}>Track-specific booking blocks</PanelTitle>
            <div className="mt-4 grid gap-3">
              {props.state.blocks.map((block) => (
                <div key={block.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold">{block.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(block.date)}, {block.start}-{block.end} - {block.room}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{block.track}</Badge>
                      <Badge variant="outline">{block.type}</Badge>
                      <Badge variant="secondary">{makePeriods(block).length} periods</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {props.view === 'schedule' ? (
          <Panel>
            <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
              <PanelTitle icon={<Search />}>Schedule and keys</PanelTitle>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder="Search submissions" />
                <Button onClick={props.onExport}>
                  <Download data-icon="inline-start" />
                  Export
                </Button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4">Key</th>
                    <th className="py-3 pr-4">Submission</th>
                    <th className="py-3 pr-4">Presenter</th>
                    <th className="py-3 pr-4">Track</th>
                    <th className="py-3 pr-4">Booking</th>
                    <th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {props.filteredSubmissions.map((submission) => {
                    const presenter = presenterFor(props.state, submission);
                    return (
                      <tr key={submission.id}>
                        <td className="py-3 pr-4 font-mono text-xs">{submission.key}</td>
                        <td className="py-3 pr-4">
                          <p className="font-medium">{submission.title}</p>
                          <p className="text-xs text-muted-foreground">{submission.type}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p>{presenter?.name}</p>
                          <p className="text-xs text-muted-foreground">{presenter?.institution}</p>
                        </td>
                        <td className="py-3 pr-4">{submission.track}</td>
                        <td className="py-3 pr-4">{periodLabel(props.state, submission.assignedPeriodId)}</td>
                        <td className="py-3 pr-4"><Status status={submission.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

function PanelTitle({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold">
      <span className="[&_svg]:size-4 [&_svg]:text-primary">{icon}</span>
      {children}
    </h2>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="[&_svg]:size-4 [&_svg]:text-primary">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Info({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function Status({ status }: { status: Submission['status'] }) {
  if (status === 'scheduled') return <Badge className="bg-emerald-600 text-white">Scheduled</Badge>;
  if (status === 'needs help') return <Badge className="bg-amber-500 text-amber-950">Needs help</Badge>;
  return <Badge variant="outline">Unscheduled</Badge>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
