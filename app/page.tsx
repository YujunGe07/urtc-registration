'use client';

import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Download,
  FileDown,
  Filter,
  Link2,
  Lock,
  Mail,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Unlock,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: {
          name: string;
          title?: string;
          description: string;
          inputSchema: object;
          annotations?: {
            readOnlyHint?: boolean;
            untrustedContentHint?: boolean;
          };
          execute: (input: unknown) => unknown | Promise<unknown>;
        },
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}

type PresentationType =
  | 'Full paper'
  | 'Poster'
  | 'Lightning talk'
  | 'Workshop'
  | 'Panel';

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

type Presentation = {
  id: string;
  submissionId: string;
  title: string;
  type: PresentationType;
  track: Track;
  durationMinutes: number;
  presenterIds: string[];
  controllerId: string;
  token: string;
  status: 'unscheduled' | 'scheduled' | 'needs_help';
  assignedSlotId: string | null;
  locked: boolean;
  notes: string;
  av: string;
};

type Slot = {
  id: string;
  date: '2027-05-14' | '2027-05-15' | '2027-05-16';
  start: string;
  end: string;
  room: string;
  block: string;
  capacity: number;
  types: PresentationType[];
  tracks: Track[] | 'any';
  locked: boolean;
  protected?: boolean;
};

type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
};

type SchedulerState = {
  presenters: Presenter[];
  presentations: Presentation[];
  slots: Slot[];
  audit: AuditEvent[];
};

const tracks: Track[] = [
  'AI and Systems',
  'Bioengineering',
  'Circuits and Devices',
  'Climate and Energy',
  'Human-Centered Computing',
  'Robotics',
];

const presentationTypes: PresentationType[] = [
  'Full paper',
  'Poster',
  'Lightning talk',
  'Workshop',
  'Panel',
];

const typeDurations: Record<PresentationType, number> = {
  'Full paper': 15,
  Poster: 60,
  'Lightning talk': 5,
  Workshop: 50,
  Panel: 50,
};

const seedState: SchedulerState = {
  presenters: [
    {
      id: 'pr-001',
      name: 'Maya Patel',
      email: 'maya.patel@example.edu',
      institution: 'UC Berkeley',
      timezone: 'America/Los_Angeles',
      arrival: 'Friday evening',
      departure: 'Sunday afternoon',
    },
    {
      id: 'pr-002',
      name: 'Daniel Kim',
      email: 'daniel.kim@example.edu',
      institution: 'University of Washington',
      timezone: 'America/Los_Angeles',
      arrival: 'Saturday morning',
      departure: 'Sunday morning',
    },
    {
      id: 'pr-003',
      name: 'Sofia Chen',
      email: 'sofia.chen@example.edu',
      institution: 'Stanford University',
      timezone: 'America/Los_Angeles',
      arrival: 'Friday afternoon',
      departure: 'Sunday afternoon',
    },
    {
      id: 'pr-004',
      name: 'Andre Williams',
      email: 'andre.williams@example.edu',
      institution: 'Harvey Mudd College',
      timezone: 'America/Los_Angeles',
      arrival: 'Friday evening',
      departure: 'Sunday noon',
    },
    {
      id: 'pr-005',
      name: 'Priya Nair',
      email: 'priya.nair@example.edu',
      institution: 'UCLA',
      timezone: 'America/Los_Angeles',
      arrival: 'Saturday morning',
      departure: 'Sunday afternoon',
    },
  ],
  presentations: [
    {
      id: 'paper-201',
      submissionId: 'SURTC-2027-201',
      title: 'Edge Scheduling for Low-Power Vision Models',
      type: 'Full paper',
      track: 'AI and Systems',
      durationMinutes: 15,
      presenterIds: ['pr-001'],
      controllerId: 'pr-001',
      token: 'maya-edge-201',
      status: 'scheduled',
      assignedSlotId: 'sat-ai-1015',
      locked: false,
      notes: 'Can present Saturday after 10 AM.',
      av: 'HDMI preferred',
    },
    {
      id: 'paper-214',
      submissionId: 'SURTC-2027-214',
      title: 'Adaptive Microfluidics for Rapid Cell Sorting',
      type: 'Full paper',
      track: 'Bioengineering',
      durationMinutes: 15,
      presenterIds: ['pr-002'],
      controllerId: 'pr-002',
      token: 'daniel-bio-214',
      status: 'unscheduled',
      assignedSlotId: null,
      locked: false,
      notes: 'Arrives Saturday morning.',
      av: 'Audio for short embedded clip',
    },
    {
      id: 'paper-226',
      submissionId: 'SURTC-2027-226',
      title: 'Thermal-Aware Routing in Student-Built Satellites',
      type: 'Poster',
      track: 'Circuits and Devices',
      durationMinutes: 60,
      presenterIds: ['pr-003'],
      controllerId: 'pr-003',
      token: 'sofia-poster-226',
      status: 'scheduled',
      assignedSlotId: 'sun-poster-a',
      locked: false,
      notes: 'Local presenter.',
      av: 'Poster board only',
    },
    {
      id: 'paper-230',
      submissionId: 'SURTC-2027-230',
      title: 'Community Grid Forecasting After Wildfire Events',
      type: 'Lightning talk',
      track: 'Climate and Energy',
      durationMinutes: 5,
      presenterIds: ['pr-004'],
      controllerId: 'pr-004',
      token: 'andre-grid-230',
      status: 'unscheduled',
      assignedSlotId: null,
      locked: false,
      notes: 'Needs to leave before Sunday afternoon.',
      av: 'One slide deck',
    },
    {
      id: 'paper-241',
      submissionId: 'SURTC-2027-241',
      title: 'Accessible Haptics for Lab Training',
      type: 'Workshop',
      track: 'Human-Centered Computing',
      durationMinutes: 50,
      presenterIds: ['pr-005'],
      controllerId: 'pr-005',
      token: 'priya-haptics-241',
      status: 'needs_help',
      assignedSlotId: null,
      locked: false,
      notes: 'Needs table space and accessibility review.',
      av: 'Tables, power strips',
    },
    {
      id: 'paper-242',
      submissionId: 'SURTC-2027-242',
      title: 'Robot Swarm Recovery With Sparse Beacons',
      type: 'Full paper',
      track: 'Robotics',
      durationMinutes: 15,
      presenterIds: ['pr-001'],
      controllerId: 'pr-001',
      token: 'maya-robotics-242',
      status: 'unscheduled',
      assignedSlotId: null,
      locked: false,
      notes: 'Same presenter as SURTC-2027-201, so overlap checks matter.',
      av: 'Projector',
    },
  ],
  slots: [
    {
      id: 'fri-mixer',
      date: '2027-05-14',
      start: '18:00',
      end: '20:00',
      room: 'Packard Atrium',
      block: 'Welcome reception and industry mixer',
      capacity: 0,
      types: [],
      tracks: 'any',
      locked: true,
      protected: true,
    },
    {
      id: 'sat-ai-1000',
      date: '2027-05-15',
      start: '10:00',
      end: '10:15',
      room: 'Packard 101',
      block: 'AI and Systems papers',
      capacity: 1,
      types: ['Full paper'],
      tracks: ['AI and Systems', 'Robotics'],
      locked: false,
    },
    {
      id: 'sat-ai-1015',
      date: '2027-05-15',
      start: '10:15',
      end: '10:30',
      room: 'Packard 101',
      block: 'AI and Systems papers',
      capacity: 1,
      types: ['Full paper'],
      tracks: ['AI and Systems', 'Robotics'],
      locked: false,
    },
    {
      id: 'sat-bio-1000',
      date: '2027-05-15',
      start: '10:00',
      end: '10:15',
      room: 'Packard 202',
      block: 'Bioengineering papers',
      capacity: 1,
      types: ['Full paper'],
      tracks: ['Bioengineering', 'Circuits and Devices'],
      locked: false,
    },
    {
      id: 'sat-bio-1015',
      date: '2027-05-15',
      start: '10:15',
      end: '10:30',
      room: 'Packard 202',
      block: 'Bioengineering papers',
      capacity: 1,
      types: ['Full paper'],
      tracks: ['Bioengineering', 'Circuits and Devices'],
      locked: false,
    },
    {
      id: 'sat-keynote',
      date: '2027-05-15',
      start: '12:00',
      end: '13:00',
      room: 'Packard Auditorium',
      block: 'Keynote and lunch hold',
      capacity: 0,
      types: [],
      tracks: 'any',
      locked: true,
      protected: true,
    },
    {
      id: 'sat-workshop-a',
      date: '2027-05-15',
      start: '15:00',
      end: '15:50',
      room: 'Packard 202',
      block: 'Hands-on workshops',
      capacity: 1,
      types: ['Workshop', 'Panel'],
      tracks: 'any',
      locked: false,
    },
    {
      id: 'sun-poster-a',
      date: '2027-05-16',
      start: '09:30',
      end: '10:30',
      room: 'Packard Atrium',
      block: 'Poster session A',
      capacity: 24,
      types: ['Poster'],
      tracks: 'any',
      locked: false,
    },
    {
      id: 'sun-poster-b',
      date: '2027-05-16',
      start: '10:45',
      end: '11:45',
      room: 'Packard Atrium',
      block: 'Poster session B',
      capacity: 24,
      types: ['Poster'],
      tracks: 'any',
      locked: false,
    },
    {
      id: 'sun-lightning-a',
      date: '2027-05-16',
      start: '11:50',
      end: '12:20',
      room: 'Packard 101',
      block: 'Lightning talks',
      capacity: 6,
      types: ['Lightning talk'],
      tracks: 'any',
      locked: false,
    },
  ],
  audit: [
    {
      id: 'evt-001',
      at: '2026-09-10T09:12:00.000Z',
      actor: 'System seed',
      action: 'Imported presentations',
      detail: 'Loaded 6 accepted presentations and 10 scheduling blocks.',
    },
  ],
};

const storageKey = 'stanford-urtc-2027-scheduler-prototype';
const pacificFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'America/Los_Angeles',
});

function minutes(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function overlaps(a: Slot, b: Slot) {
  return a.date === b.date && minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);
}

function dateLabel(date: Slot['date']) {
  return pacificFormatter.format(new Date(`${date}T12:00:00-07:00`));
}

function slotLabel(slot: Slot) {
  return `${dateLabel(slot.date)}, ${slot.start}-${slot.end} PT`;
}

function findPresenter(state: SchedulerState, id: string) {
  return state.presenters.find((presenter) => presenter.id === id);
}

function findSlot(state: SchedulerState, id: string | null) {
  return state.slots.find((slot) => slot.id === id) ?? null;
}

function assignedPresentations(state: SchedulerState, slotId: string) {
  return state.presentations.filter((presentation) => presentation.assignedSlotId === slotId);
}

function getSlotProblems(state: SchedulerState, presentation: Presentation, slot: Slot) {
  const problems: string[] = [];
  const assigned = assignedPresentations(state, slot.id).filter(
    (item) => item.id !== presentation.id,
  );
  const assignedSlotIds = new Set(
    state.presentations
      .filter((item) => item.id !== presentation.id && item.presenterIds.some((id) => presentation.presenterIds.includes(id)))
      .map((item) => item.assignedSlotId)
      .filter(Boolean) as string[],
  );

  if (presentation.locked) problems.push('Presentation is locked');
  if (slot.locked) problems.push('Slot is locked');
  if (!slot.types.includes(presentation.type)) problems.push('Wrong presentation type');
  if (slot.tracks !== 'any' && !slot.tracks.includes(presentation.track)) {
    problems.push('Wrong technical track');
  }
  if (presentation.durationMinutes > minutes(slot.end) - minutes(slot.start)) {
    problems.push('Duration does not fit');
  }
  if (assigned.length >= slot.capacity) problems.push('Slot is full');
  const overlapping = state.slots.filter((candidate) => assignedSlotIds.has(candidate.id) && overlaps(candidate, slot));
  if (overlapping.length > 0) problems.push('Presenter has an overlapping assignment');

  return problems;
}

function exportSchedule(state: SchedulerState) {
  const rows = state.presentations.map((presentation) => {
    const presenter = findPresenter(state, presentation.controllerId);
    const slot = findSlot(state, presentation.assignedSlotId);
    return {
      submission_id: presentation.submissionId,
      title: presentation.title,
      type: presentation.type,
      track: presentation.track,
      presenter: presenter?.name ?? '',
      email: presenter?.email ?? '',
      institution: presenter?.institution ?? '',
      status: presentation.status,
      date: slot?.date ?? '',
      start: slot?.start ?? '',
      end: slot?.end ?? '',
      room: slot?.room ?? '',
      block: slot?.block ?? '',
      locked: String(presentation.locked),
      av: presentation.av,
      internal_notes: presentation.notes,
    };
  });

  const headers = Object.keys(rows[0]);
  const body = rows.map((row) =>
    headers
      .map((header) => `"${String(row[header as keyof typeof row]).replaceAll('"', '""')}"`)
      .join(','),
  );
  return [headers.join(','), ...body].join('\n');
}

function downloadText(filename: string, text: string, type = 'text/csv') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function audit(actor: string, action: string, detail: string): AuditEvent {
  return {
    id: `evt-${crypto.randomUUID()}`,
    at: new Date().toISOString(),
    actor,
    action,
    detail,
  };
}

export default function Home() {
  const [state, setState] = useState<SchedulerState>(seedState);
  const [activeToken, setActiveToken] = useState(seedState.presentations[1].token);
  const [selectedTab, setSelectedTab] = useState('presenter');
  const [trackFilter, setTrackFilter] = useState<Track | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<PresentationType | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<Presentation['status'] | 'All'>('All');
  const [query, setQuery] = useState('');
  const [helpReason, setHelpReason] = useState('');
  const [toast, setToast] = useState('Prototype data is local to this browser.');

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setState(JSON.parse(saved) as SchedulerState);
    }
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) setActiveToken(token);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;

    const lifecycle = new AbortController();

    const register = async () => {
      await context.registerTool(
        {
          name: 'assign_presentation_slot',
          title: 'Assign presentation slot',
          description:
            'Assign one accepted Stanford URTC presentation to one eligible schedule slot using the same conflict checks as the organizer dashboard.',
          inputSchema: {
            type: 'object',
            properties: {
              presentationId: { type: 'string' },
              slotId: { type: 'string' },
            },
            required: ['presentationId', 'slotId'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            if (
              !input ||
              typeof input !== 'object' ||
              !('presentationId' in input) ||
              !('slotId' in input)
            ) {
              throw new Error('Expected presentationId and slotId.');
            }
            const { presentationId, slotId } = input as {
              presentationId: string;
              slotId: string;
            };
            const presentation = state.presentations.find((item) => item.id === presentationId);
            const slot = state.slots.find((item) => item.id === slotId);
            if (!presentation || !slot) throw new Error('Unknown presentation or slot.');
            const problems = getSlotProblems(state, presentation, slot).filter(
              (problem) => problem !== 'Presentation is locked',
            );
            if (problems.length > 0) {
              return { ok: false, problems };
            }
            organizerAssign(presentationId, slotId);
            return {
              ok: true,
              presentationId,
              slotId,
              label: `${presentation.submissionId} assigned to ${slotLabel(slot)} in ${slot.room}`,
            };
          },
        },
        { signal: lifecycle.signal },
      );

      await context.registerTool(
        {
          name: 'get_schedule_export',
          title: 'Get schedule export',
          description:
            'Return the current Stanford URTC schedule export as CSV plus summary counts.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute() {
            return {
              scheduled: state.presentations.filter((item) => item.status === 'scheduled').length,
              total: state.presentations.length,
              csv: exportSchedule(state),
            };
          },
        },
        { signal: lifecycle.signal },
      );
    };

    register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [state]);

  const activePresentation =
    state.presentations.find((presentation) => presentation.token === activeToken) ??
    state.presentations[0];
  const activePresenter = findPresenter(state, activePresentation.controllerId);
  const activeSlot = findSlot(state, activePresentation.assignedSlotId);

  const eligibleSlots = state.slots
    .filter((slot) => !slot.protected)
    .map((slot) => ({
      slot,
      problems: getSlotProblems(state, activePresentation, slot),
    }));

  const filteredPresentations = useMemo(() => {
    return state.presentations.filter((presentation) => {
      const presenter = findPresenter(state, presentation.controllerId);
      const haystack = `${presentation.submissionId} ${presentation.title} ${presenter?.name ?? ''} ${presenter?.institution ?? ''}`.toLowerCase();
      return (
        (trackFilter === 'All' || presentation.track === trackFilter) &&
        (typeFilter === 'All' || presentation.type === typeFilter) &&
        (statusFilter === 'All' || presentation.status === statusFilter) &&
        haystack.includes(query.toLowerCase())
      );
    });
  }, [query, state, statusFilter, trackFilter, typeFilter]);

  const scheduled = state.presentations.filter((item) => item.status === 'scheduled').length;
  const needsHelp = state.presentations.filter((item) => item.status === 'needs_help').length;
  const capacityUsed = state.slots.reduce(
    (total, slot) => total + assignedPresentations(state, slot.id).length,
    0,
  );
  const capacityTotal = state.slots
    .filter((slot) => !slot.protected)
    .reduce((total, slot) => total + slot.capacity, 0);

  function bookSlot(slotId: string) {
    const slot = state.slots.find((candidate) => candidate.id === slotId);
    if (!slot) return;
    const problems = getSlotProblems(state, activePresentation, slot);
    if (problems.length > 0) {
      setToast(problems.join('. '));
      return;
    }
    setState((current) => ({
      ...current,
      presentations: current.presentations.map((presentation) =>
        presentation.id === activePresentation.id
          ? {
              ...presentation,
              assignedSlotId: slotId,
              status: 'scheduled',
            }
          : presentation,
      ),
      audit: [
        audit(
          activePresenter?.name ?? 'Presenter',
          'Selected slot',
          `${activePresentation.submissionId} booked ${slotLabel(slot)} in ${slot.room}.`,
        ),
        ...current.audit,
      ],
    }));
    setToast(`Confirmed: ${slotLabel(slot)} in ${slot.room}.`);
  }

  function requestHelp() {
    setState((current) => ({
      ...current,
      presentations: current.presentations.map((presentation) =>
        presentation.id === activePresentation.id
          ? {
              ...presentation,
              status: 'needs_help',
              assignedSlotId: null,
              notes: helpReason || presentation.notes,
            }
          : presentation,
      ),
      audit: [
        audit(
          activePresenter?.name ?? 'Presenter',
          'Requested organizer help',
          `${activePresentation.submissionId}: ${helpReason || 'No eligible times work.'}`,
        ),
        ...current.audit,
      ],
    }));
    setHelpReason('');
    setToast('Marked for organizer follow-up.');
  }

  function organizerAssign(presentationId: string, slotId: string) {
    const presentation = state.presentations.find((item) => item.id === presentationId);
    if (!presentation) return;
    if (!slotId) {
      setState((current) => ({
        ...current,
        presentations: current.presentations.map((item) =>
          item.id === presentationId
            ? {
                ...item,
                assignedSlotId: null,
                status: 'unscheduled',
              }
            : item,
        ),
        audit: [
          audit('Organizer', 'Cleared assignment', `${presentation.submissionId} marked unscheduled.`),
          ...current.audit,
        ],
      }));
      setToast(`${presentation.submissionId} marked unscheduled.`);
      return;
    }
    const slot = state.slots.find((item) => item.id === slotId);
    if (!slot) return;
    const problems = getSlotProblems(state, presentation, slot).filter(
      (problem) => problem !== 'Presentation is locked',
    );
    if (problems.length > 0) {
      setToast(problems.join('. '));
      return;
    }
    setState((current) => ({
      ...current,
      presentations: current.presentations.map((item) =>
        item.id === presentationId
          ? {
              ...item,
              assignedSlotId: slotId || null,
              status: slotId ? 'scheduled' : 'unscheduled',
            }
          : item,
      ),
      audit: [
        audit(
          'Organizer',
          'Manual assignment',
          `${presentation.submissionId} moved to ${slotLabel(slot)} in ${slot.room}.`,
        ),
        ...current.audit,
      ],
    }));
  }

  function togglePresentationLock(presentationId: string) {
    setState((current) => ({
      ...current,
      presentations: current.presentations.map((presentation) =>
        presentation.id === presentationId
          ? {
              ...presentation,
              locked: !presentation.locked,
            }
          : presentation,
      ),
      audit: [
        audit('Organizer', 'Changed lock', `${presentationId} lock toggled.`),
        ...current.audit,
      ],
    }));
  }

  function sendReminder(presentation: Presentation) {
    const presenter = findPresenter(state, presentation.controllerId);
    setState((current) => ({
      ...current,
      audit: [
        audit(
          'Organizer',
          'Prepared reminder',
          `Reminder queued for ${presenter?.email ?? presentation.controllerId} using token ${presentation.token}.`,
        ),
        ...current.audit,
      ],
    }));
    setToast(`Reminder prepared for ${presenter?.name ?? 'presenter'}.`);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Stanford URTC 2027 scheduling prototype
              </p>
              <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Presenter self-scheduling for accepted talks, posters, and workshops
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setState(seedState);
                  setToast('Prototype reset to seeded conference data.');
                }}
              >
                <RotateCcw data-icon="inline-start" />
                Reset demo
              </Button>
              <Button
                onClick={() =>
                  downloadText(
                    'stanford-urtc-2027-schedule.csv',
                    exportSchedule(state),
                  )
                }
              >
                <Download data-icon="inline-start" />
                Export schedule
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Scheduled" value={`${scheduled}/${state.presentations.length}`} icon={<CalendarCheck />} tone="green" />
            <Metric label="Needs follow-up" value={String(needsHelp)} icon={<AlertCircle />} tone="amber" />
            <Metric label="Slot capacity used" value={`${capacityUsed}/${capacityTotal}`} icon={<Users />} tone="blue" />
            <Metric label="Scheduling deadline" value="Apr 23, 2027" icon={<Clock3 />} tone="ink" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="w-full overflow-x-auto lg:w-fit">
              <TabsTrigger value="presenter">Presenter link</TabsTrigger>
              <TabsTrigger value="organizer">Organizer board</TabsTrigger>
              <TabsTrigger value="schedule">Schedule grid</TabsTrigger>
              <TabsTrigger value="rules">Rules and schema</TabsTrigger>
            </TabsList>
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              {toast}
            </div>
          </div>

          <TabsContent value="presenter">
            <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <Panel>
                  <PanelTitle icon={<Link2 />}>Demo private links</PanelTitle>
                  <div className="space-y-2">
                    {state.presentations.map((presentation) => {
                      const presenter = findPresenter(state, presentation.controllerId);
                      return (
                        <button
                          key={presentation.id}
                          className={`w-full rounded-lg border p-3 text-left transition hover:border-primary/60 ${
                            presentation.token === activeToken
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card'
                          }`}
                          onClick={() => {
                            setActiveToken(presentation.token);
                            window.history.replaceState(null, '', `?token=${presentation.token}`);
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{presenter?.name}</span>
                            <StatusBadge status={presentation.status} />
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {presentation.submissionId} - {presentation.title}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </Panel>

                <Panel>
                  <PanelTitle icon={<ShieldCheck />}>Access model</PanelTitle>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Each invitation token opens exactly one accepted presentation. The public schedule export omits emails, notes, and tokens; organizer exports can include them.
                  </p>
                </Panel>
              </aside>

              <Panel className="min-h-[620px]">
                <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 lg:flex-row lg:items-start">
                  <div>
                    <Badge variant="outline">{activePresentation.submissionId}</Badge>
                    <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight">
                      {activePresentation.title}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>{activePresenter?.name}</span>
                      <span>{activePresenter?.institution}</span>
                      <span>{activePresentation.track}</span>
                      <span>{activePresentation.type}</span>
                      <span>{activePresentation.durationMinutes} min</span>
                    </div>
                  </div>
                  <StatusBadge status={activePresentation.status} />
                </div>

                {activeSlot ? (
                  <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 size-5" />
                      <div>
                        <p className="font-medium">Confirmed presentation time</p>
                        <p className="mt-1 text-sm">
                          {slotLabel(activeSlot)} in {activeSlot.room}, {activeSlot.block}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {eligibleSlots.map(({ slot, problems }) => {
                    const occupied = assignedPresentations(state, slot.id).filter(
                      (item) => item.id !== activePresentation.id,
                    ).length;
                    const selected = activePresentation.assignedSlotId === slot.id;
                    const disabled = problems.length > 0 || activePresentation.locked;
                    return (
                      <div
                        key={slot.id}
                        className={`rounded-lg border p-4 ${
                          selected ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{slot.block}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {slotLabel(slot)} - {slot.room}
                            </p>
                          </div>
                          <Badge variant={disabled ? 'outline' : 'secondary'}>
                            {occupied}/{slot.capacity}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {slot.types.map((type) => (
                            <Badge key={type} variant="outline">
                              {type}
                            </Badge>
                          ))}
                          <Badge variant="outline">
                            {slot.tracks === 'any' ? 'Any track' : slot.tracks.join(', ')}
                          </Badge>
                        </div>
                        {problems.length > 0 ? (
                          <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            {problems.join('. ')}
                          </p>
                        ) : (
                          <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            Eligible and available for this presentation.
                          </p>
                        )}
                        <Button
                          className="mt-4 w-full"
                          variant={selected ? 'secondary' : 'default'}
                          disabled={disabled}
                          onClick={() => bookSlot(slot.id)}
                        >
                          {selected ? 'Selected' : 'Choose this slot'}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
                  <p className="font-medium">None of these times work</p>
                  <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
                    <Textarea
                      value={helpReason}
                      onChange={(event) => setHelpReason(event.target.value)}
                      placeholder="Briefly describe arrival, departure, class, accessibility, or travel limits."
                    />
                    <Button variant="outline" onClick={requestHelp}>
                      Send to organizers
                    </Button>
                  </div>
                </div>
              </Panel>
            </div>
          </TabsContent>

          <TabsContent value="organizer">
            <Panel>
              <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <PanelTitle icon={<Filter />}>Organizer dashboard</PanelTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Filter, move, lock, remind, and export accepted presentations.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search title, presenter, id"
                    aria-label="Search schedule"
                  />
                  <NativeSelect value={trackFilter} onChange={(event) => setTrackFilter(event.target.value as Track | 'All')}>
                    <option>All</option>
                    {tracks.map((track) => (
                      <option key={track}>{track}</option>
                    ))}
                  </NativeSelect>
                  <NativeSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as PresentationType | 'All')}>
                    <option>All</option>
                    {presentationTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </NativeSelect>
                  <NativeSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Presentation['status'] | 'All')}>
                    <option>All</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="unscheduled">Unscheduled</option>
                    <option value="needs_help">Needs help</option>
                  </NativeSelect>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-3 pr-4">Presentation</th>
                      <th className="py-3 pr-4">Presenter</th>
                      <th className="py-3 pr-4">Track and type</th>
                      <th className="py-3 pr-4">Assignment</th>
                      <th className="py-3 pr-4">Organizer move</th>
                      <th className="py-3 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPresentations.map((presentation) => {
                      const presenter = findPresenter(state, presentation.controllerId);
                      const slot = findSlot(state, presentation.assignedSlotId);
                      return (
                        <tr key={presentation.id} className="align-top">
                          <td className="py-4 pr-4">
                            <p className="font-medium">{presentation.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{presentation.submissionId}</p>
                            <p className="mt-2 text-xs text-muted-foreground">{presentation.notes}</p>
                          </td>
                          <td className="py-4 pr-4">
                            <p>{presenter?.name}</p>
                            <p className="text-xs text-muted-foreground">{presenter?.institution}</p>
                            <p className="text-xs text-muted-foreground">{presenter?.arrival} - {presenter?.departure}</p>
                          </td>
                          <td className="py-4 pr-4">
                            <div className="space-y-2">
                              <Badge variant="outline">{presentation.track}</Badge>
                              <Badge variant="secondary">{presentation.type}</Badge>
                              <StatusBadge status={presentation.status} />
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            {slot ? (
                              <div>
                                <p>{slotLabel(slot)}</p>
                                <p className="text-xs text-muted-foreground">{slot.room}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not assigned</span>
                            )}
                          </td>
                          <td className="py-4 pr-4">
                            <NativeSelect
                              value={presentation.assignedSlotId ?? ''}
                              disabled={presentation.locked}
                              onChange={(event) => organizerAssign(presentation.id, event.target.value)}
                            >
                              <option value="">Choose slot</option>
                              {state.slots
                                .filter((candidate) => !candidate.protected)
                                .map((candidate) => (
                                  <option key={candidate.id} value={candidate.id}>
                                    {slotLabel(candidate)} - {candidate.room}
                                  </option>
                                ))}
                            </NativeSelect>
                          </td>
                          <td className="py-4 pr-4">
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => togglePresentationLock(presentation.id)}>
                                {presentation.locked ? <Unlock data-icon="inline-start" /> : <Lock data-icon="inline-start" />}
                                {presentation.locked ? 'Unlock' : 'Lock'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => sendReminder(presentation)}>
                                <Mail data-icon="inline-start" />
                                Remind
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <Panel>
                <PanelTitle icon={<CalendarCheck />}>Room and session capacity</PanelTitle>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {state.slots.map((slot) => {
                    const assigned = assignedPresentations(state, slot.id);
                    return (
                      <div
                        key={slot.id}
                        className={`rounded-lg border p-4 ${
                          slot.protected ? 'border-dashed bg-muted/50' : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{slot.block}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {slotLabel(slot)} - {slot.room}
                            </p>
                          </div>
                          {slot.locked ? <Lock className="size-4 text-muted-foreground" /> : <Unlock className="size-4 text-muted-foreground" />}
                        </div>
                        {slot.protected ? (
                          <p className="mt-3 text-sm text-muted-foreground">
                            Protected program time, hidden from presenter choices.
                          </p>
                        ) : (
                          <>
                            <div className="mt-3 h-2 rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{
                                  width: `${Math.min(100, (assigned.length / slot.capacity) * 100)}%`,
                                }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {assigned.length} of {slot.capacity} slots used
                            </p>
                            <div className="mt-3 space-y-2">
                              {assigned.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No presentations assigned.</p>
                              ) : (
                                assigned.map((presentation) => (
                                  <div key={presentation.id} className="rounded-md bg-muted/50 p-2 text-sm">
                                    {presentation.submissionId}: {presentation.title}
                                  </div>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel>
                <PanelTitle icon={<Search />}>Audit trail</PanelTitle>
                <div className="mt-4 max-h-[640px] space-y-3 overflow-y-auto pr-1">
                  {state.audit.map((event) => (
                    <div key={event.id} className="rounded-lg border border-border bg-card p-3">
                      <p className="text-sm font-medium">{event.action}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.actor} - {new Date(event.at).toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">{event.detail}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </TabsContent>

          <TabsContent value="rules">
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel>
                <PanelTitle icon={<Sparkles />}>MVP rules implemented</PanelTitle>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  <Rule>Secure token maps to one presentation and one scheduling controller.</Rule>
                  <Rule>Presenter sees only slots that match type, track, duration, capacity, and lock rules.</Rule>
                  <Rule>One-capacity talk slots cannot be double-booked.</Rule>
                  <Rule>Poster and lightning sessions can accept many presentations in the same block.</Rule>
                  <Rule>Same presenter cannot hold overlapping assignments across multiple accepted papers.</Rule>
                  <Rule>Organizers can manually move, lock, remind, and export records.</Rule>
                  <Rule>Protected program time blocks meals, keynotes, receptions, and tours from bookings.</Rule>
                </ul>
              </Panel>

              <Panel>
                <PanelTitle icon={<FileDown />}>Backend schema target</PanelTitle>
                <div className="mt-4 grid gap-2 text-sm">
                  {[
                    'presentations',
                    'presenters',
                    'presentation_presenters',
                    'rooms',
                    'session_blocks',
                    'slots',
                    'assignments',
                    'invitations',
                    'availability_exceptions',
                    'audit_log',
                    'organizers',
                  ].map((table) => (
                    <div key={table} className="rounded-lg border border-border bg-muted/35 px-3 py-2 font-mono text-xs">
                      {table}
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadText(
                        'stanford-urtc-2027-prototype-state.json',
                        JSON.stringify(state, null, 2),
                        'application/json',
                      )
                    }
                  >
                    <FileDown data-icon="inline-start" />
                    Export JSON state
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadText(
                        'stanford-urtc-2027-schedule.csv',
                        exportSchedule(state),
                      )
                    }
                  >
                    <Download data-icon="inline-start" />
                    Export CSV
                  </Button>
                </div>
              </Panel>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
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

function PanelTitle({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold">
      <span className="[&_svg]:size-4 [&_svg]:text-primary">{icon}</span>
      {children}
    </h2>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'green' | 'amber' | 'blue' | 'ink';
}) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    amber: 'bg-amber-50 text-amber-950 border-amber-200',
    blue: 'bg-sky-50 text-sky-950 border-sky-200',
    ink: 'bg-slate-50 text-slate-950 border-slate-200',
  };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <span className="[&_svg]:size-4">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Presentation['status'] }) {
  if (status === 'scheduled') return <Badge className="bg-emerald-600 text-white">Scheduled</Badge>;
  if (status === 'needs_help') return <Badge className="bg-amber-500 text-amber-950">Needs help</Badge>;
  return <Badge variant="outline">Unscheduled</Badge>;
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}
