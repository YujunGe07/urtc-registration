'use client';
// Auth endpoints are owned by Sites and must use top-level anchor navigation.
/* oxlint-disable next/no-html-link-for-pages */
// React Compiler is not enabled; this rule reports an invariant for async handlers.
/* oxlint-disable react/react-compiler */

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SubmitEvent,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  FileText,
  KeyRound,
  Layers3,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  LifeBuoy,
  Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  type Block,
  type Submission,
  type PortalData,
  type Presenter,
  tracks,
  typeDurations,
  makePeriods,
  formatDate,
  periodLabel,
  presenterFor,
  emptyState,
} from '@/lib/scheduler';

import {
  portalApi as api,
  pagesBuild,
  backendConfigured,
  organizerSignIn,
  organizerSignOut,
  DEMO_KEY,
  demoActive,
  resetDemo,
} from '@/lib/portal-client';

type Role = 'home' | 'presenter' | 'organizer';
type View = 'overview' | 'submissions' | 'blocks' | 'schedule';
const blankData: PortalData = {
  state: emptyState,
  revision: 0,
  organizer: false,
  signedIn: false,
  email: '',
  submissionId: null,
  occupancy: {},
};
const viewNames: Record<View, string> = {
  overview: 'Overview',
  submissions: 'Submissions',
  blocks: 'Track blocks',
  schedule: 'Schedule',
};
const navItems: [View, typeof LayoutDashboard][] = [
  ['overview', LayoutDashboard],
  ['submissions', FileText],
  ['blocks', Layers3],
  ['schedule', CalendarDays],
];
function timeLabel(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function saveFile(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(value: string | number | undefined | null) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
function exportSchedule(data: PortalData) {
  const rows = [
    [
      'Submission',
      'Presenter',
      'Email',
      'Institution',
      'Format',
      'Track',
      'Status',
      'Booking',
      'AV needs',
    ],
    ...data.state.submissions.map((s) => {
      const p = presenterFor(data.state, s);
      return [
        s.title,
        p?.name,
        p?.email,
        p?.institution,
        s.type,
        s.track,
        s.status,
        periodLabel(data.state, s.assignedPeriodId),
        s.avNeeds,
      ];
    }),
  ];
  saveFile(
    'urtc-2027-schedule.csv',
    '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n'),
    'text/csv;charset=utf-8',
  );
}
function calendarFile(data: PortalData, sub: Submission) {
  const block = data.state.blocks.find((b) =>
    makePeriods(b).some((p) => p.id === sub.assignedPeriodId),
  );
  const period =
    block && makePeriods(block).find((p) => p.id === sub.assignedPeriodId);
  if (!block || !period) return;
  const esc = (s: string) =>
    s
      .replaceAll('\\', '\\\\')
      .replaceAll('\n', '\\n')
      .replaceAll(',', '\\,')
      .replaceAll(';', '\\;');
  const stamp = (t: string) =>
    block.date.replaceAll('-', '') + 'T' + t.replace(':', '') + '00';
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//URTC//Scheduling Portal//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE',
    'TZID:America/Los_Angeles',
    'BEGIN:DAYLIGHT',
    'DTSTART:20070311T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'TZOFFSETFROM:-0800',
    'TZOFFSETTO:-0700',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'DTSTART:20071104T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0800',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${sub.id}@urtc-scheduler`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')}`,
    `DTSTART;TZID=America/Los_Angeles:${stamp(period.start)}`,
    `DTEND;TZID=America/Los_Angeles:${stamp(period.end)}`,
    `SUMMARY:${esc(sub.title)}`,
    `LOCATION:${esc(block.room)}`,
    `DESCRIPTION:${esc('URTC 2027 · ' + block.track + ' · ' + block.title)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  saveFile('urtc-presentation.ics', content, 'text/calendar;charset=utf-8');
}
export default function Home() {
  const [role, setRole] = useState<Role>('home'),
    [view, setView] = useState<View>('overview');
  const [data, setData] = useState<PortalData>(blankData),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
      null,
    ),
    [loadError, setLoadError] = useState(false);
  const [keyInput, setKeyInput] = useState(''),
    [step, setStep] = useState(0);
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('all'),
    [trackFilter, setTrackFilter] = useState('all');
  const [modal, setModal] = useState<{
    type:
      | 'submission'
      | 'block'
      | 'delete-submission'
      | 'delete-block'
      | 'cancel'
      | 'sample';
    id?: string;
  } | null>(null);
  const [formError, setFormError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(''),
    [note, setNote] = useState('');
  const [calendarDay, setCalendarDay] = useState('all');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const sync = () => {
      const q = new URLSearchParams(window.location.search);
      if (pagesBuild && q.get('role') === 'organizer')
        sessionStorage.removeItem('urtc-demo-active');
      setRole(
        q.get('role') === 'organizer'
          ? 'organizer'
          : q.get('role') === 'presenter' || q.has('key')
            ? 'presenter'
            : 'home',
      );
      const v = q.get('view');
      setView(v && v in viewNames ? (v as View) : 'overview');
      if (q.get('key')) {
        setKeyInput(q.get('key')!);
        window.history.replaceState(null, '', '?role=presenter');
      }
    };
    sync();
    window.addEventListener('popstate', sync);
    void refresh();
    return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [role, view, step]);
  async function refresh() {
    setLoading(true);
    try {
      const next = await api();
      setData(next);
      if (next.submissionId) {
        const own = next.state.submissions.find(
          (s) => s.id === next.submissionId,
        );
        setStep((current) =>
          current === 0 && own ? (own.assignedPeriodId ? 3 : 1) : current,
        );
      }
      setLoadError(false);
    } catch (e) {
      setNotice({ text: (e as Error).message, error: true });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }
  function navigate(next: Role, nextView: View = 'overview') {
    if (pagesBuild && next === 'organizer' && demoActive()) {
      sessionStorage.removeItem('urtc-demo-active');
      void refresh();
    }
    setRole(next);
    setView(nextView);
    setSearch('');
    setStatus('all');
    setTrackFilter('all');
    setNotice(null);
    window.history.pushState(
      null,
      '',
      next === 'home'
        ? window.location.pathname
        : `?role=${next}${next === 'organizer' ? `&view=${nextView}` : ''}`,
    );
  }
  async function act(
    action: Record<string, unknown>,
    message: string,
    close = false,
  ) {
    setBusy(true);
    setFormError('');
    try {
      const result = await api({ ...action, revision: data.revision });
      setData(result);
      if (action.kind === 'login') {
        const own = result.state.submissions.find(
          (s) => s.id === result.submissionId,
        );
        setStep(own?.assignedPeriodId ? 3 : 1);
      }
      setNotice({ text: message, error: false });
      if (close) setModal(null);
      return true;
    } catch (e) {
      setFormError((e as Error).message);
      setNotice({ text: (e as Error).message, error: true });
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function login(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      await act(
        { kind: 'login', key: keyInput },
        'Submission found. Review your details to continue.',
      )
    ) {
      setKeyInput('');
    }
  }
  async function signout() {
    setBusy(true);
    try {
      await api({ kind: 'logout' });
      setStep(0);
      setKeyInput('');
      setSelectedSlot('');
      await refresh();
      navigate('home');
    } catch (e) {
      setNotice({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }
  const own = data.state.submissions.find((s) => s.id === data.submissionId);
  const presenter = own ? presenterFor(data.state, own) : null;
  const booked = data.state.submissions.filter(
    (s) => s.assignedPeriodId,
  ).length;
  const help = data.state.submissions.filter((s) => s.status === 'needs help');
  const capacity = data.state.blocks
    .filter((b) => !b.locked)
    .reduce((sum, b) => sum + makePeriods(b).length * b.capacityPerPeriod, 0);
  const visible = data.state.submissions.filter((s) => {
    const p = presenterFor(data.state, s);
    return (
      `${s.title} ${s.key} ${p?.name} ${p?.email}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === 'all' || s.status === status) &&
      (trackFilter === 'all' || s.track === trackFilter)
    );
  });
  const openModal = (type: NonNullable<typeof modal>['type'], id?: string) => {
    setFormError('');
    setModal({ type, id });
  };

  return (
    <div className={`portal ${role === 'home' ? 'landing' : 'workspace'}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <button
          className="brand"
          onClick={() => navigate('home')}
          aria-label="URTC portal home"
        >
          <span className="brand-mark">
            <Layers3 size={22} />
          </span>
          <span>
            URTC<span className="brand-year">2027</span>
          </span>
          <span className="brand-divider" />
          <span className="brand-caption">Scheduling portal</span>
        </button>
        <div className="topbar-right">
          <span className="event-meta">
            <CalendarDays size={15} />
            May 14–16, 2027
            <span className="meta-divider" />
            Pacific Time
          </span>
          {role !== 'home' && (
            <button className="home-link" onClick={() => navigate('home')}>
              <ArrowLeft size={15} /> Portal home
            </button>
          )}
        </div>
      </header>
      {pagesBuild && (
        <div className="demo-banner">
          <div>
            <strong>
              {demoActive()
                ? 'Presenter demo'
                : backendConfigured
                  ? 'Presenter walkthrough available'
                  : 'Preview · Sample data only'}
            </strong>
            <span>
              {demoActive()
                ? 'Changes stay in this browser tab. No real presentation is booked.'
                : 'Try the presenter flow with key ' + DEMO_KEY + '.'}
            </span>
          </div>
          <div className="button-row">
            {demoActive() ? (
              <button
                onClick={async () => {
                  await resetDemo();
                  setStep(0);
                  setSelectedSlot('');
                  await refresh();
                  navigate('presenter');
                }}
              >
                Reset demo
              </button>
            ) : (
              <button
                onClick={async () => {
                  setKeyInput(DEMO_KEY);
                  if (
                    await act(
                      { kind: 'login', key: DEMO_KEY },
                      'Presenter demo ready.',
                    )
                  ) {
                    setLoadError(false);
                    setStep(1);
                    navigate('presenter');
                  }
                }}
              >
                Try presenter demo <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
      {role === 'home' ? (
        <main id="main" className="home-main">
          <div className="home-heading">
            <span className="eyebrow">
              UNDERGRADUATE RESEARCH TECHNOLOGY CONFERENCE
            </span>
            <h1 ref={heading} tabIndex={-1}>
              Great research.
              <br />
              <span>A place on the schedule.</span>
            </h1>
            <p>
              Your next step starts here. Choose your workspace to prepare for
              URTC 2027.
            </p>
          </div>
          <div className="role-grid">
            <button
              className="role-card presenter-card"
              onClick={() => navigate('presenter')}
            >
              <div className="role-card-top">
                <span className="role-icon">
                  <GraduationCap size={27} />
                </span>
                <span className="role-tag">FOR ACCEPTED PRESENTERS</span>
              </div>
              <h2>Presenter</h2>
              <p>
                Find your submission, check the details, and reserve your
                presentation time.
              </p>
              <div className="role-steps">
                <span>01 &nbsp; Verify</span>
                <span>02 &nbsp; Review</span>
                <span>03 &nbsp; Book</span>
              </div>
              <div className="role-cta">
                Schedule my presentation <ArrowRight size={21} />
              </div>
            </button>
            <button
              className="role-card organizer-card"
              onClick={() => navigate('organizer')}
            >
              <div className="role-card-top">
                <span className="role-icon">
                  <LayoutDashboard size={25} />
                </span>
                <span className="role-tag">FOR THE CONFERENCE TEAM</span>
              </div>
              <h2>Organizer</h2>
              <p>
                Manage accepted research, shape track sessions, and bring the
                program together.
              </p>
              <div className="role-steps">
                <span>Submissions</span>
                <span>Track blocks</span>
                <span>Schedule</span>
              </div>
              <div className="role-cta">
                Open organizer workspace <ArrowRight size={21} />
              </div>
            </button>
          </div>
          <div className="home-bottom">
            <span>
              <KeyRound size={17} /> Presenters, have the unique key from your
              invitation ready.
            </span>
            <span>
              <ShieldCheck size={17} /> Organizer access is restricted.
            </span>
          </div>
          <footer className="home-footer">
            <span>URTC 2027 · Research worth sharing.</span>
            <span>May 14–16 · All scheduling times in Pacific Time</span>
          </footer>
        </main>
      ) : (
        <div className="workspace-grid">
          <aside className="sidebar">
            <div className="workspace-label">
              {role === 'organizer'
                ? 'CONFERENCE MANAGEMENT'
                : 'YOUR PRESENTATION'}
            </div>
            {role === 'organizer' ? (
              <>
                <nav aria-label="Organizer navigation">
                  {navItems.map(([id, Icon]) => (
                    <button
                      key={id}
                      className={`nav-item ${view === id ? 'active' : ''}`}
                      onClick={() => navigate('organizer', id)}
                      aria-current={view === id ? 'page' : undefined}
                    >
                      <Icon size={19} />
                      {viewNames[id]}
                      {id === 'submissions' && data.organizer && (
                        <span className="nav-count">
                          {data.state.submissions.length}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
                <div className="sidebar-note">
                  <ShieldCheck size={20} />
                  <strong>Organizer workspace</strong>
                  <p>
                    Manage the program with one shared, up-to-date schedule.
                  </p>
                </div>
                {data.organizer && (
                  <div className="sidebar-account">
                    <span className="avatar">
                      {data.email.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>Conference organizer</strong>
                      <span>{data.email}</span>
                    </div>
                    {pagesBuild ? (
                      <button
                        className="icon-button"
                        aria-label="Sign out of organizer account"
                        onClick={async () => {
                          await organizerSignOut();
                          await refresh();
                          navigate('home');
                        }}
                      >
                        <LogOut size={17} />
                      </button>
                    ) : (
                      <a
                        href="/signout-with-chatgpt?return_to=%2F"
                        aria-label="Sign out of organizer account"
                      >
                        <LogOut size={17} />
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <nav aria-label="Presentation progress" className="step-nav">
                  {[
                    'Verify your key',
                    'Review details',
                    'Choose a time',
                    'Confirmation',
                  ].map((label, i) => (
                    <div
                      key={label}
                      className={`step-item ${step === i ? 'current' : ''} ${step > i ? 'complete' : ''}`}
                      aria-current={step === i ? 'step' : undefined}
                    >
                      <span>{step > i ? <Check size={15} /> : i + 1}</span>
                      <div>
                        <strong>{label}</strong>
                        <small>
                          {
                            [
                              'From your acceptance email',
                              'Your accepted submission',
                              'Available times in your track',
                              'You’re ready to present',
                            ][i]
                          }
                        </small>
                      </div>
                    </div>
                  ))}
                </nav>
                <div className="sidebar-note">
                  <CalendarDays size={20} />
                  <strong>A time that works for you</strong>
                  <p>
                    Only sessions matching your accepted track and format are
                    available to book.
                  </p>
                  <span className="timezone-pill">America/Los_Angeles</span>
                </div>
                {own && (
                  <button
                    className="nav-item signout"
                    disabled={busy}
                    onClick={signout}
                  >
                    <LogOut size={18} /> Sign out of submission
                  </button>
                )}
              </>
            )}
          </aside>
          <main id="main" className="workspace-main">
            <div className="breadcrumbs">
              <span>{role === 'organizer' ? 'Organizer' : 'Presenter'}</span>
              <ChevronRight size={14} />
              <span>
                {role === 'organizer'
                  ? viewNames[view]
                  : [
                      'Sign in',
                      'Submission details',
                      'Book a slot',
                      'Booking confirmed',
                    ][step]}
              </span>
            </div>
            {notice && (
              <div
                className={`notice ${notice.error ? 'notice-error' : ''}`}
                role={notice.error ? 'alert' : 'status'}
              >
                {notice.error ? (
                  <AlertCircle size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                <span>{notice.text}</span>
                <button
                  aria-label="Dismiss message"
                  onClick={() => setNotice(null)}
                >
                  <X size={17} />
                </button>
              </div>
            )}
            {loadError ? (
              <Empty
                icon={<AlertCircle />}
                title="We couldn’t load the schedule"
                text="Please try again. Your existing bookings are safe."
                action={<Button onClick={refresh}>Try again</Button>}
              />
            ) : loading ? (
              <output className="loading-state">
                <Loader2 className="spin" />
                Loading your workspace…
              </output>
            ) : role === 'organizer' && !data.organizer ? (
              <section className="auth-panel">
                <span className="large-icon">
                  <ShieldCheck size={30} />
                </span>
                <span className="eyebrow">ORGANIZER ACCESS</span>
                <h1 ref={heading} tabIndex={-1}>
                  {data.signedIn
                    ? 'Organizer access required'
                    : 'Welcome, conference team.'}
                </h1>
                {pagesBuild ? (
                  <>
                    <p>
                      {!backendConfigured
                        ? 'The shared conference is being connected. Presenter demo access is available now; real organizer sign-in will open after setup.'
                        : data.signedIn
                          ? `${data.email} is not an approved organizer. Please switch to your invited email address.`
                          : 'Enter your approved email address to open the organizer workspace. No confirmation email is required.'}
                    </p>
                    {backendConfigured &&
                      (data.signedIn ? (
                        <Button
                          onClick={async () => {
                            await organizerSignOut();
                            await refresh();
                          }}
                        >
                          Switch account
                        </Button>
                      ) : (
                        <form
                          className="key-form"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setBusy(true);
                            try {
                              const result =
                                await organizerSignIn(organizerEmail);
                              setData(result);
                              setNotice(null);
                            } catch (error) {
                              setNotice({
                                text: (error as Error).message,
                                error: true,
                              });
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          <Field label="Organizer email">
                            <Input
                              type="email"
                              value={organizerEmail}
                              onChange={(e) =>
                                setOrganizerEmail(e.target.value)
                              }
                              placeholder="you@university.edu"
                              required
                              autoComplete="email"
                            />
                          </Field>
                          <Button disabled={busy} type="submit">
                            {busy ? (
                              <Loader2 className="spin" />
                            ) : (
                              'Open organizer workspace'
                            )}
                          </Button>
                          <p className="muted">
                            Temporary email-only access: anyone who knows an
                            approved address can enter. Email ownership is not
                            verified.
                          </p>
                        </form>
                      ))}
                  </>
                ) : (
                  <>
                    {' '}
                    <p>
                      {data.signedIn
                        ? `${data.email} is not on the organizer list. Sign in with your approved account to continue.`
                        : 'Sign in with your approved ChatGPT account to manage submissions and the conference schedule.'}
                    </p>
                    <a
                      className="primary-link"
                      href={
                        data.signedIn
                          ? '/signout-with-chatgpt?return_to=%2F%3Frole%3Dorganizer'
                          : '/signin-with-chatgpt?return_to=%2F%3Frole%3Dorganizer'
                      }
                    >
                      {data.signedIn
                        ? 'Switch account'
                        : 'Continue with ChatGPT'}
                      <ArrowRight size={17} />
                    </a>
                  </>
                )}
                <button
                  className="text-link"
                  onClick={() => navigate('presenter')}
                >
                  Presenting at URTC? Use your unique key instead.
                </button>
              </section>
            ) : role === 'presenter' ? (
              <>
                {!own || step === 0 ? (
                  <section className="auth-panel">
                    <span className="large-icon">
                      <KeyRound size={28} />
                    </span>
                    <span className="eyebrow">LET’S GET YOU SCHEDULED</span>
                    <h1 ref={heading} tabIndex={-1}>
                      Your research. Your time.
                    </h1>
                    <p>
                      Enter the unique presenter key from your acceptance email
                      to find your submission.
                    </p>
                    <form onSubmit={login} className="key-form">
                      <Field label="Presenter key">
                        <Input
                          autoComplete="off"
                          spellCheck={false}
                          value={keyInput}
                          onChange={(e) => setKeyInput(e.target.value)}
                          placeholder="URTC-…"
                          required
                          maxLength={100}
                          className="key-input"
                        />
                      </Field>
                      <Button type="submit" disabled={busy || !keyInput.trim()}>
                        {busy ? (
                          <Loader2 className="spin" />
                        ) : (
                          <>
                            Find my submission
                            <ArrowRight size={17} />
                          </>
                        )}
                      </Button>
                    </form>
                    <div className="auth-hint">
                      <LockKeyhole size={16} />
                      <span>
                        Your key opens only your accepted submission. Keep it
                        private.
                      </span>
                    </div>
                    <details className="help-details">
                      <summary>Can’t find your presenter key?</summary>
                      <p>
                        Check your acceptance or scheduling invitation,
                        including your spam folder. If it is missing, reply to
                        your acceptance email and ask the conference team for
                        your key.
                      </p>
                    </details>
                  </section>
                ) : (
                  <>
                    <div className="page-heading">
                      <div>
                        <span className="eyebrow">PRESENTER WORKSPACE</span>
                        <h1 ref={heading} tabIndex={-1}>
                          {step === 1
                            ? 'First, a quick review.'
                            : step === 2
                              ? 'Find your moment.'
                              : 'You’re on the schedule.'}
                        </h1>
                        <p>
                          {step === 1
                            ? 'Confirm your submission and contact details before choosing a time.'
                            : step === 2
                              ? 'Choose an available slot, then confirm your selection. All times are Pacific.'
                              : 'Your presentation time is saved. Add it to your calendar so you’re ready.'}
                        </p>
                      </div>
                      <Status submission={own} />
                    </div>
                    {step === 1 && presenter && (
                      <div className="review-grid">
                        <section className="surface submission-detail">
                          <div className="section-kicker">
                            <FileText size={18} />
                            ACCEPTED SUBMISSION
                          </div>
                          <h2>{own.title}</h2>
                          <div className="tags">
                            <span className="track-chip">{own.track}</span>
                            <span className="neutral-chip">{own.type}</span>
                            <span className="neutral-chip">
                              <Clock3 size={14} />
                              {own.durationMinutes} minutes
                            </span>
                          </div>
                          <div className="detail-section">
                            <h3>Abstract</h3>
                            <p>{own.abstract || 'No abstract provided.'}</p>
                          </div>
                          <div className="detail-section">
                            <h3>Coauthors</h3>
                            <p>{own.coauthors || 'No coauthors listed.'}</p>
                          </div>
                          <div className="detail-section">
                            <h3>Presentation & AV requirements</h3>
                            <p>
                              {own.avNeeds || 'No special requirements noted.'}
                            </p>
                          </div>
                          <div className="soft-note">
                            <LifeBuoy size={18} />
                            <p>
                              Something incorrect? Reply to your acceptance
                              email so the team can update the accepted record.
                            </p>
                          </div>
                        </section>
                        <section className="surface">
                          <div className="section-title">
                            <h2>Presenter details</h2>
                            <Users size={19} />
                          </div>
                          <p className="muted mb-5">
                            How you’ll appear in the program.
                          </p>
                          <form
                            key={presenter.id}
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const fields = Object.fromEntries(
                                new FormData(e.currentTarget),
                              );
                              if (
                                await act(
                                  { kind: 'update-contact', data: fields },
                                  'Presenter details saved.',
                                )
                              )
                                setStep(2);
                            }}
                            className="form-stack"
                          >
                            <Field label="Full name">
                              <Input
                                name="name"
                                defaultValue={presenter.name}
                                required
                                maxLength={150}
                              />
                            </Field>
                            <Field label="Email address">
                              <Input
                                type="email"
                                name="email"
                                defaultValue={presenter.email}
                                required
                                maxLength={254}
                              />
                            </Field>
                            <Field label="Institution">
                              <Input
                                name="institution"
                                defaultValue={presenter.institution}
                                required
                                maxLength={200}
                              />
                            </Field>
                            <div className="soft-note">
                              <Clock3 size={17} />
                              <p>
                                Conference times are shown in Pacific Time,
                                regardless of your location.
                              </p>
                            </div>
                            <Button disabled={busy || own.locked} type="submit">
                              {busy ? (
                                <Loader2 className="spin" />
                              ) : (
                                <>
                                  Save & choose a time
                                  <ArrowRight size={17} />
                                </>
                              )}
                            </Button>
                            {own.locked && (
                              <p className="muted">
                                Your record is locked. Contact the organizer to
                                update it.
                              </p>
                            )}
                          </form>
                        </section>
                      </div>
                    )}
                    {step === 2 && (
                      <>
                        <div className="presenter-summary">
                          <span className="avatar">
                            <GraduationCap size={20} />
                          </span>
                          <div>
                            <strong>{own.title}</strong>
                            <span>
                              {own.track} · {own.type} · {own.durationMinutes}{' '}
                              minutes
                            </span>
                          </div>
                          <button
                            className="text-link"
                            onClick={() => setStep(1)}
                          >
                            Review details
                          </button>
                        </div>
                        {own.assignedPeriodId && (
                          <div className="soft-note current-booking">
                            <CheckCircle2 size={18} />
                            <p>
                              Current booking:{' '}
                              <strong>
                                {periodLabel(data.state, own.assignedPeriodId)}
                              </strong>
                              . It stays reserved until you confirm a
                              replacement.
                            </p>
                          </div>
                        )}
                        <div className="slot-layout">
                          <div className="block-list">
                            {data.state.blocks
                              .filter(
                                (b) =>
                                  b.track === own.track &&
                                  b.type === own.type &&
                                  b.presentationMinutes >= own.durationMinutes,
                              )
                              .map((b) => (
                                <section
                                  key={b.id}
                                  className="surface slot-block"
                                >
                                  <div className="block-header">
                                    <div>
                                      <span className="eyebrow">
                                        {formatDate(b.date)}
                                      </span>
                                      <h2>{b.title}</h2>
                                      <p>
                                        <MapPin size={14} />
                                        {b.room}
                                        <span>·</span>
                                        {b.presentationMinutes} min per slot
                                        {b.chair && (
                                          <>
                                            <span>·</span>
                                            {b.chair}
                                          </>
                                        )}
                                      </p>
                                    </div>
                                    {b.locked && (
                                      <span className="neutral-chip">
                                        <LockKeyhole size={13} />
                                        Booking closed
                                      </span>
                                    )}
                                  </div>
                                  <div className="slots">
                                    {makePeriods(b).map((p) => {
                                      const full =
                                        (data.occupancy[p.id] ?? 0) >=
                                        b.capacityPerPeriod;
                                      const current =
                                        own.assignedPeriodId === p.id;
                                      return (
                                        <button
                                          key={p.id}
                                          className={`slot ${selectedSlot === p.id ? 'selected' : ''} ${current ? 'reserved' : ''}`}
                                          disabled={
                                            busy ||
                                            full ||
                                            b.locked ||
                                            own.locked
                                          }
                                          aria-label={`${timeLabel(p.start)} in ${b.room}, ${full ? 'fully booked' : 'select slot'}`}
                                          aria-pressed={selectedSlot === p.id}
                                          onClick={() => setSelectedSlot(p.id)}
                                        >
                                          <strong>{timeLabel(p.start)}</strong>
                                          <span>
                                            {current
                                              ? 'Your current time'
                                              : full
                                                ? 'Fully booked'
                                                : b.locked
                                                  ? 'Closed'
                                                  : `${b.capacityPerPeriod - (data.occupancy[p.id] ?? 0)} available`}
                                          </span>
                                          {selectedSlot === p.id && (
                                            <CheckCircle2 size={16} />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </section>
                              ))}
                            {!data.state.blocks.some(
                              (b) =>
                                b.track === own.track &&
                                b.type === own.type &&
                                b.presentationMinutes >= own.durationMinutes,
                            ) && (
                              <Empty
                                icon={<CalendarDays />}
                                title="Your track’s times aren’t available yet"
                                text="Send an availability note below so the team can help you schedule."
                              />
                            )}
                          </div>
                          <aside className="surface booking-review">
                            <span className="section-kicker">
                              YOUR SELECTION
                            </span>
                            <h2>
                              {selectedSlot
                                ? 'Ready to confirm?'
                                : 'Choose your time'}
                            </h2>
                            {selectedSlot ? (
                              <>
                                <div className="booking-selection">
                                  <CalendarDays size={22} />
                                  <strong>
                                    {periodLabel(data.state, selectedSlot)}
                                  </strong>
                                </div>
                                <p className="muted">
                                  We’ll check availability again when you
                                  confirm.
                                </p>
                                <Button
                                  disabled={busy || own.locked}
                                  onClick={async () => {
                                    if (
                                      await act(
                                        {
                                          kind: 'book',
                                          periodId: selectedSlot,
                                        },
                                        'Your booking is confirmed.',
                                      )
                                    ) {
                                      setStep(3);
                                      setSelectedSlot('');
                                    } else {
                                      await refresh();
                                    }
                                  }}
                                >
                                  {busy ? (
                                    <Loader2 className="spin" />
                                  ) : (
                                    <>
                                      Confirm booking
                                      <Check size={17} />
                                    </>
                                  )}
                                </Button>
                              </>
                            ) : (
                              <p className="muted">
                                Select one of the available times to review and
                                confirm your booking.
                              </p>
                            )}
                            <div className="slot-legend">
                              <span>
                                <i />
                                Available
                              </span>
                              <span>
                                <i className="selected-dot" />
                                Selected
                              </span>
                            </div>
                            <button
                              className="text-link"
                              disabled={loading}
                              onClick={refresh}
                            >
                              <RefreshCw size={14} /> Refresh availability
                            </button>
                          </aside>
                        </div>
                        <section className="help-panel">
                          <div>
                            <LifeBuoy size={23} />
                            <h2>Need a different time?</h2>
                            <p>
                              Share your availability with the team. Your
                              current booking will stay reserved.
                            </p>
                          </div>
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (
                                await act(
                                  { kind: 'help', note },
                                  'Your request is in the organizer’s queue. Your existing booking is unchanged.',
                                )
                              )
                                setNote('');
                            }}
                          >
                            <label className="sr-only" htmlFor="availability">
                              Your availability
                            </label>
                            <Textarea
                              id="availability"
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              placeholder="Tell us which dates and times work for you…"
                              required
                              maxLength={2000}
                            />
                            <Button
                              variant="outline"
                              disabled={busy || !note.trim()}
                            >
                              Request scheduling help
                            </Button>
                          </form>
                        </section>
                      </>
                    )}
                    {step === 3 && (
                      <section className="surface confirmation">
                        <span className="confirmation-icon">
                          <Check size={34} />
                        </span>
                        <span className="eyebrow">BOOKING CONFIRMED</span>
                        <h2>{own.title}</h2>
                        <div className="confirmation-ticket">
                          <div>
                            <CalendarDays size={22} />
                            <strong>
                              {periodLabel(data.state, own.assignedPeriodId)}
                            </strong>
                          </div>
                          <div className="ticket-meta">
                            <span>{presenter?.name}</span>
                            <span>
                              {own.type} · {own.durationMinutes} minutes
                            </span>
                          </div>
                        </div>
                        <p>
                          You can return with your presenter key to review or
                          change this booking.
                        </p>
                        <div className="button-row">
                          <Button onClick={() => calendarFile(data, own)}>
                            <Download size={17} />
                            Add to calendar
                          </Button>
                          <Button variant="outline" onClick={() => setStep(2)}>
                            Change time
                          </Button>
                        </div>
                        {!own.locked && (
                          <button
                            className="text-link danger-text"
                            disabled={busy}
                            onClick={() => openModal('cancel', own.id)}
                          >
                            Cancel booking
                          </button>
                        )}
                        {own.locked && (
                          <div className="soft-note">
                            <LockKeyhole size={17} />
                            The organizer has locked this booking.
                          </div>
                        )}
                      </section>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">
                      URTC 2027 / CONFERENCE MANAGEMENT
                    </span>
                    <h1 ref={heading} tabIndex={-1}>
                      {view === 'overview'
                        ? 'Let’s bring the program together.'
                        : viewNames[view]}
                    </h1>
                    <p>
                      {view === 'overview'
                        ? 'A clear view of your research program, from acceptance to presentation.'
                        : view === 'submissions'
                          ? 'Manage accepted research and give each presenter their unique key.'
                          : view === 'blocks'
                            ? 'Define when and where each track can present.'
                            : 'Review confirmed presentations and keep the team aligned.'}
                    </p>
                  </div>
                  <div className="button-row">
                    <Button
                      variant="outline"
                      onClick={refresh}
                      disabled={busy}
                      aria-label="Refresh schedule"
                    >
                      <RefreshCw size={16} />
                    </Button>
                    {view === 'blocks' ? (
                      <Button onClick={() => openModal('block')}>
                        <Plus size={17} />
                        Create block
                      </Button>
                    ) : view === 'submissions' ? (
                      <Button onClick={() => openModal('submission')}>
                        <Plus size={17} />
                        Add submission
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => exportSchedule(data)}
                      >
                        <Download size={17} />
                        Export schedule
                      </Button>
                    )}
                  </div>
                </div>
                {view === 'overview' && (
                  <>
                    <div className="metrics">
                      <Metric
                        label="Accepted submissions"
                        value={data.state.submissions.length}
                        icon={<FileText />}
                        detail="Ready for the conference"
                      />
                      <Metric
                        label="Confirmed bookings"
                        value={booked}
                        icon={<CheckCircle2 />}
                        detail={`${data.state.submissions.length - booked} still to schedule`}
                        tone="green"
                      />
                      <Metric
                        label="Need attention"
                        value={help.length}
                        icon={<LifeBuoy />}
                        detail="Presenter scheduling requests"
                        tone="amber"
                      />
                      <Metric
                        label="Track blocks"
                        value={data.state.blocks.length}
                        icon={<Layers3 />}
                        detail={`${capacity} spots in open blocks`}
                      />
                    </div>
                    <div className="overview-grid">
                      <section className="surface">
                        <div className="section-title">
                          <div>
                            <h2>Program readiness</h2>
                            <p>Presentation bookings across your tracks</p>
                          </div>
                          <span className="progress-number">
                            {data.state.submissions.length
                              ? Math.round(
                                  (booked / data.state.submissions.length) *
                                    100,
                                )
                              : 0}
                            <small>%</small>
                          </span>
                        </div>
                        <div className="progress-bar">
                          <span
                            style={{
                              width: `${data.state.submissions.length ? (booked / data.state.submissions.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <div className="track-readiness">
                          {tracks.map((track, i) => {
                            const all = data.state.submissions.filter(
                                (s) => s.track === track,
                              ),
                              n = all.filter((s) => s.assignedPeriodId).length;
                            return (
                              <div className="track-row" key={track}>
                                <span className={`track-dot track-${i}`} />
                                <strong>{track}</strong>
                                <span>
                                  {n} / {all.length}
                                </span>
                                <div className="mini-progress">
                                  <span
                                    style={{
                                      width: `${all.length ? (n / all.length) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          className="section-link"
                          onClick={() => navigate('organizer', 'schedule')}
                        >
                          View full schedule
                          <ArrowRight size={16} />
                        </button>
                      </section>
                      <section className="surface attention">
                        <div className="section-title">
                          <h2>Needs attention</h2>
                          <span className="count-pill">{help.length}</span>
                        </div>
                        {help.length ? (
                          help.map((s) => (
                            <button
                              className="attention-item"
                              key={s.id}
                              onClick={() => openModal('submission', s.id)}
                            >
                              <span className="avatar amber-avatar">
                                {presenterFor(data.state, s)?.name.slice(0, 1)}
                              </span>
                              <div>
                                <strong>
                                  {presenterFor(data.state, s)?.name}
                                </strong>
                                <p>
                                  {s.helpNote ||
                                    'This presenter needs help finding a time.'}
                                </p>
                                <small>{s.track}</small>
                              </div>
                              <ChevronRight size={17} />
                            </button>
                          ))
                        ) : (
                          <div className="calm-empty">
                            <CheckCircle2 size={32} />
                            <h3>You’re all caught up.</h3>
                            <p>
                              Presenter requests will appear here when someone
                              needs a hand.
                            </p>
                          </div>
                        )}
                        <div className="soft-note">
                          <LifeBuoy size={17} />
                          <p>
                            Help requests preserve the presenter’s existing
                            booking.
                          </p>
                        </div>
                      </section>
                    </div>
                    <section className="surface">
                      <div className="section-title">
                        <h2>Recent activity</h2>
                        <span className="muted">Latest updates</span>
                      </div>
                      {data.state.log.length ? (
                        <div className="activity-list">
                          {data.state.log.slice(0, 6).map((entry) => (
                            <div key={entry.id}>
                              <span className="activity-icon">
                                <Clock3 size={15} />
                              </span>
                              <div>
                                <p>{entry.message}</p>
                                <span>{entry.actor}</span>
                              </div>
                              <time dateTime={entry.time}>
                                {new Date(entry.time).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  timeZone: 'America/Los_Angeles',
                                })}{' '}
                                PT
                              </time>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Empty
                          title="Your program starts here"
                          text="Add your first accepted submission and create a track block to open scheduling."
                          action={
                            <div className="button-row">
                              <Button onClick={() => openModal('submission')}>
                                <Plus size={16} />
                                Add submission
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => openModal('sample')}
                              >
                                Load sample conference
                              </Button>
                            </div>
                          }
                        />
                      )}
                    </section>
                  </>
                )}
                {view === 'submissions' && (
                  <section className="surface table-surface">
                    <Filters
                      search={search}
                      setSearch={setSearch}
                      status={status}
                      setStatus={setStatus}
                      track={trackFilter}
                      setTrack={setTrackFilter}
                    />
                    <div className="table-summary">
                      {visible.length} submission
                      {visible.length === 1 ? '' : 's'}
                      <span>
                        Keys are private · Share only with the assigned
                        presenter
                      </span>
                    </div>
                    {visible.length ? (
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Submission / presenter</th>
                              <th>Track & format</th>
                              <th>Status</th>
                              <th>Presenter access</th>
                              <th>
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {visible.map((s) => (
                              <tr key={s.id}>
                                <td>
                                  <button
                                    className="table-title"
                                    onClick={() =>
                                      openModal('submission', s.id)
                                    }
                                  >
                                    {s.title}
                                  </button>
                                  <span className="table-sub">
                                    {presenterFor(data.state, s)?.name} ·{' '}
                                    {presenterFor(data.state, s)?.institution}
                                  </span>
                                </td>
                                <td>
                                  <span>{s.track}</span>
                                  <span className="table-sub">
                                    {s.type} · {s.durationMinutes} min
                                  </span>
                                </td>
                                <td>
                                  <Status submission={s} />
                                  {s.locked && (
                                    <span className="table-sub">
                                      <LockKeyhole size={12} /> Locked
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <CopyKey value={s.key} />
                                </td>
                                <td aria-label="Submission actions">
                                  <div className="row-actions">
                                    <IconButton
                                      label={`Edit ${s.title}`}
                                      onClick={() =>
                                        openModal('submission', s.id)
                                      }
                                    >
                                      <Pencil size={16} />
                                    </IconButton>
                                    <IconButton
                                      label={`${s.locked ? 'Unlock' : 'Lock'} ${s.title}`}
                                      disabled={busy}
                                      onClick={() =>
                                        act(
                                          { kind: 'lock-submission', id: s.id },
                                          'Booking lock updated.',
                                        )
                                      }
                                    >
                                      {s.locked ? (
                                        <Unlock size={16} />
                                      ) : (
                                        <LockKeyhole size={16} />
                                      )}
                                    </IconButton>
                                    <IconButton
                                      label={`Delete ${s.title}`}
                                      onClick={() =>
                                        openModal('delete-submission', s.id)
                                      }
                                    >
                                      <Trash2 size={16} />
                                    </IconButton>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty
                        icon={<FileText />}
                        title={
                          data.state.submissions.length
                            ? 'No matching submissions'
                            : 'Add your first accepted submission'
                        }
                        text={
                          data.state.submissions.length
                            ? 'Try a different search or clear your filters.'
                            : 'Each submission gets a private presenter key for self-scheduling.'
                        }
                        action={
                          data.state.submissions.length ? (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSearch('');
                                setStatus('all');
                                setTrackFilter('all');
                              }}
                            >
                              Clear filters
                            </Button>
                          ) : (
                            <Button onClick={() => openModal('submission')}>
                              <Plus size={16} />
                              Add submission
                            </Button>
                          )
                        }
                      />
                    )}
                  </section>
                )}
                {view === 'blocks' && (
                  <>
                    <div className="soft-note">
                      <Layers3 size={18} />
                      <p>
                        Presenters can book slots only in matching tracks and
                        formats. Block changes must preserve existing bookings;
                        rooms cannot overlap.
                      </p>
                    </div>
                    {data.state.blocks.length ? (
                      <div className="organizer-blocks">
                        {data.state.blocks.map((b, i) => {
                          const used = data.state.submissions.filter((s) =>
                            s.assignedPeriodId?.startsWith(`${b.id}__`),
                          ).length;
                          const total =
                            makePeriods(b).length * b.capacityPerPeriod;
                          return (
                            <section
                              key={b.id}
                              className="surface organizer-block"
                            >
                              <div className="block-order">
                                <span>{String(i + 1).padStart(2, '0')}</span>
                                <div>
                                  <IconButton
                                    label={`Move ${b.title} up`}
                                    disabled={i === 0 || busy}
                                    onClick={() =>
                                      act(
                                        {
                                          kind: 'move-block',
                                          id: b.id,
                                          direction: -1,
                                        },
                                        'Block order updated.',
                                      )
                                    }
                                  >
                                    <ArrowUp size={15} />
                                  </IconButton>
                                  <IconButton
                                    label={`Move ${b.title} down`}
                                    disabled={
                                      i === data.state.blocks.length - 1 || busy
                                    }
                                    onClick={() =>
                                      act(
                                        {
                                          kind: 'move-block',
                                          id: b.id,
                                          direction: 1,
                                        },
                                        'Block order updated.',
                                      )
                                    }
                                  >
                                    <ArrowDown size={15} />
                                  </IconButton>
                                </div>
                              </div>
                              <div className="block-body">
                                <div className="tags">
                                  <span className="track-chip">{b.track}</span>
                                  <span className="neutral-chip">{b.type}</span>
                                  {b.locked && (
                                    <span className="neutral-chip">
                                      <LockKeyhole size={12} />
                                      Closed
                                    </span>
                                  )}
                                </div>
                                <h2>{b.title}</h2>
                                <div className="block-facts">
                                  <span>
                                    <CalendarDays size={15} />
                                    {formatDate(b.date)}
                                  </span>
                                  <span>
                                    <Clock3 size={15} />
                                    {timeLabel(b.start)}–{timeLabel(b.end)} PT
                                  </span>
                                  <span>
                                    <MapPin size={15} />
                                    {b.room}
                                  </span>
                                </div>
                                <p className="muted">
                                  {b.presentationMinutes} min per slot ·{' '}
                                  {b.capacityPerPeriod} spot
                                  {b.capacityPerPeriod === 1 ? '' : 's'} per
                                  time · {b.chair || 'No chair assigned'}
                                </p>
                              </div>
                              <div className="block-capacity">
                                <strong>
                                  {used}
                                  <span> / {total}</span>
                                </strong>
                                <span>spots booked</span>
                                <div className="mini-progress">
                                  <span
                                    style={{
                                      width: `${total ? (used / total) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                                <div className="button-row">
                                  <Button
                                    variant="outline"
                                    onClick={() => openModal('block', b.id)}
                                  >
                                    <Pencil size={15} />
                                    Edit
                                  </Button>
                                  <IconButton
                                    label={`Delete ${b.title}`}
                                    onClick={() =>
                                      openModal('delete-block', b.id)
                                    }
                                  >
                                    <Trash2 size={16} />
                                  </IconButton>
                                </div>
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    ) : (
                      <Empty
                        icon={<Layers3 />}
                        title="Build your conference sessions"
                        text="Create a block with a track, format, room, and time range. Available slots are generated automatically."
                        action={
                          <Button onClick={() => openModal('block')}>
                            <Plus size={16} />
                            Create a block
                          </Button>
                        }
                      />
                    )}
                  </>
                )}
                {view === 'schedule' && (
                  <>
                    <div className="schedule-toolbar">
                      <div
                        className="day-tabs"
                        aria-label="Filter schedule date"
                      >
                        <button
                          className={calendarDay === 'all' ? 'active' : ''}
                          onClick={() => setCalendarDay('all')}
                        >
                          All dates
                        </button>
                        {Array.from(
                          new Set(data.state.blocks.map((b) => b.date)),
                        )
                          .sort()
                          .map((date) => (
                            <button
                              key={date}
                              className={calendarDay === date ? 'active' : ''}
                              onClick={() => setCalendarDay(date)}
                            >
                              {formatDate(date)}
                            </button>
                          ))}
                      </div>
                      <span className="timezone-pill">
                        <Clock3 size={14} />
                        Pacific Time
                      </span>
                    </div>
                    <section className="surface table-surface">
                      <Filters
                        search={search}
                        setSearch={setSearch}
                        status={status}
                        setStatus={setStatus}
                        track={trackFilter}
                        setTrack={setTrackFilter}
                      />
                      {visible.filter(
                        (s) =>
                          calendarDay === 'all' ||
                          data.state.blocks.some(
                            (b) =>
                              b.date === calendarDay &&
                              s.assignedPeriodId?.startsWith(`${b.id}__`),
                          ),
                      ).length ? (
                        <div className="schedule-list">
                          {visible
                            .filter(
                              (s) =>
                                calendarDay === 'all' ||
                                data.state.blocks.some(
                                  (b) =>
                                    b.date === calendarDay &&
                                    s.assignedPeriodId?.startsWith(`${b.id}__`),
                                ),
                            )
                            .sort((a, b) =>
                              periodLabel(
                                data.state,
                                a.assignedPeriodId,
                              ).localeCompare(
                                periodLabel(data.state, b.assignedPeriodId),
                              ),
                            )
                            .map((s) => {
                              const b = data.state.blocks.find((b) =>
                                s.assignedPeriodId?.startsWith(`${b.id}__`),
                              );
                              const p =
                                b &&
                                makePeriods(b).find(
                                  (p) => p.id === s.assignedPeriodId,
                                );
                              return (
                                <article key={s.id} className="schedule-row">
                                  <div className="schedule-time">
                                    <strong>
                                      {p ? timeLabel(p.start) : 'Unscheduled'}
                                    </strong>
                                    <span>
                                      {b
                                        ? formatDate(b.date)
                                        : 'Awaiting booking'}
                                    </span>
                                  </div>
                                  <div className="schedule-info">
                                    <button
                                      className="table-title"
                                      onClick={() =>
                                        openModal('submission', s.id)
                                      }
                                    >
                                      {s.title}
                                    </button>
                                    <p>
                                      {presenterFor(data.state, s)?.name} ·{' '}
                                      {s.track}
                                    </p>
                                    <span>
                                      {s.type} · {s.durationMinutes} min
                                      {b && <> · {b.room}</>}
                                    </span>
                                  </div>
                                  <Status submission={s} />
                                  {s.assignedPeriodId && (
                                    <IconButton
                                      label={`Cancel booking for ${s.title}`}
                                      onClick={() => openModal('cancel', s.id)}
                                    >
                                      <X size={16} />
                                    </IconButton>
                                  )}
                                </article>
                              );
                            })}
                        </div>
                      ) : (
                        <Empty
                          icon={<CalendarDays />}
                          title="No presentations in this view"
                          text="Try another date or adjust your filters."
                        />
                      )}
                    </section>
                  </>
                )}
              </>
            )}
            <footer className="workspace-footer">
              <span>URTC 2027 Scheduling Portal</span>
              <span>
                <ShieldCheck size={13} />
                Shared conference schedule · Pacific Time
              </span>
            </footer>
          </main>
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal.type === 'submission'
              ? modal.id
                ? 'Edit submission'
                : 'Add accepted submission'
              : modal.type === 'block'
                ? modal.id
                  ? 'Edit track block'
                  : 'Create track block'
                : modal.type === 'sample'
                  ? 'Load a sample conference?'
                  : modal.type === 'cancel'
                    ? 'Cancel this booking?'
                    : modal.type === 'delete-block'
                      ? 'Delete this block?'
                      : 'Delete this submission?'
          }
          onClose={() => !busy && setModal(null)}
          busy={busy}
        >
          {formError && (
            <div className="notice notice-error" role="alert">
              <AlertCircle size={18} />
              {formError}
            </div>
          )}
          {modal.type === 'submission' ? (
            <SubmissionForm
              submission={data.state.submissions.find((s) => s.id === modal.id)}
              presenter={presenterFor(
                data.state,
                data.state.submissions.find((s) => s.id === modal.id) ?? null,
              )}
              busy={busy}
              onCancel={() => setModal(null)}
              onSave={(values) =>
                act(
                  { kind: 'save-submission', id: modal.id, data: values },
                  'Submission saved. Its private presenter key is ready to copy.',
                  true,
                )
              }
            />
          ) : modal.type === 'block' ? (
            <BlockForm
              block={data.state.blocks.find((b) => b.id === modal.id)}
              busy={busy}
              onCancel={() => setModal(null)}
              onSave={(values) =>
                act(
                  { kind: 'save-block', id: modal.id, data: values },
                  'Track block saved. Presenter availability is updated.',
                  true,
                )
              }
            />
          ) : (
            <>
              <p className="modal-description">
                {modal.type === 'sample'
                  ? 'This adds four sample submissions and six track blocks from the original portal. Use these for a walkthrough, then remove sample records before accepting real bookings.'
                  : modal.type === 'cancel'
                    ? 'This releases the reserved time. The submission remains accepted, and the presenter can choose another available slot.'
                    : modal.type === 'delete-block'
                      ? 'This removes the block and its available slots. Blocks with confirmed bookings cannot be deleted.'
                      : `This permanently removes “${data.state.submissions.find((s) => s.id === modal.id)?.title}” and releases its booking. Its presenter key will stop working.`}
              </p>
              <div className="modal-actions">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  Keep{' '}
                  {modal.type === 'cancel'
                    ? 'booking'
                    : modal.type === 'sample'
                      ? 'empty conference'
                      : 'record'}
                </Button>
                <Button
                  className={
                    modal.type !== 'sample' ? 'destructive-button' : ''
                  }
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await act(
                        {
                          kind:
                            modal.type === 'sample'
                              ? 'sample-data'
                              : modal.type,
                          id: modal.id,
                        },
                        modal.type === 'sample'
                          ? 'Sample conference loaded.'
                          : modal.type === 'cancel'
                            ? 'Booking cancelled.'
                            : 'Record deleted.',
                        true,
                      )
                    ) {
                      if (modal.type === 'cancel' && role === 'presenter')
                        setStep(2);
                    }
                  }}
                >
                  {busy ? (
                    <Loader2 className="spin" />
                  ) : modal.type === 'sample' ? (
                    'Load sample conference'
                  ) : modal.type === 'cancel' ? (
                    'Cancel booking'
                  ) : (
                    'Delete record'
                  )}
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Status({ submission: s }: { submission: Submission }) {
  return (
    <span
      className={`status status-${s.status === 'needs help' ? 'help' : s.assignedPeriodId ? 'booked' : 'pending'}`}
    >
      {s.status === 'needs help' ? (
        <AlertCircle size={12} />
      ) : s.assignedPeriodId ? (
        <CheckCircle2 size={12} />
      ) : (
        <Clock3 size={12} />
      )}{' '}
      {s.status === 'needs help'
        ? 'Needs attention'
        : s.assignedPeriodId
          ? 'Confirmed'
          : 'Unscheduled'}
    </span>
  );
}
function IconButton({
  label,
  onClick,
  children,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Metric({
  label,
  value,
  icon,
  detail,
  tone = 'blue',
}: {
  label: string;
  value: number;
  icon: ReactNode;
  detail: string;
  tone?: string;
}) {
  return (
    <section className="metric">
      <div>
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}>{icon}</span>
      </div>
      <strong>{value.toString().padStart(2, '0')}</strong>
      <p>{detail}</p>
    </section>
  );
}
function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <section className="empty-state">
      {icon && <span className="large-icon">{icon}</span>}
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </section>
  );
}
function CopyKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState(false);
  return (
    <div>
      <button
        className="copy-key"
        title="Copy private presenter key"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setError(false);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            setError(true);
          }
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}{' '}
        {copied ? 'Copied!' : 'Copy key'}
      </button>
      {error && (
        <input
          aria-label="Select and copy presenter key"
          readOnly
          value={value}
          onFocus={(e) => e.target.select()}
        />
      )}
    </div>
  );
}
function Filters(p: {
  search: string;
  setSearch: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  track: string;
  setTrack: (v: string) => void;
}) {
  return (
    <div className="filters">
      <div className="search-input">
        <Search size={17} />
        <Input
          aria-label="Search submissions"
          placeholder="Search research, presenter, or key…"
          value={p.search}
          onChange={(e) => p.setSearch(e.target.value)}
        />
      </div>
      <NativeSelect
        aria-label="Filter by track"
        value={p.track}
        onChange={(e) => p.setTrack(e.target.value)}
      >
        <option value="all">All tracks</option>
        {tracks.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Filter by status"
        value={p.status}
        onChange={(e) => p.setStatus(e.target.value)}
      >
        <option value="all">All statuses</option>
        <option value="scheduled">Confirmed</option>
        <option value="unscheduled">Unscheduled</option>
        <option value="needs help">Needs attention</option>
      </NativeSelect>
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
  busy,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <IconButton label="Close dialog" disabled={busy} onClick={onClose}>
          <X size={21} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
function SubmissionForm({
  submission: s,
  presenter: p,
  busy,
  onSave,
  onCancel,
}: {
  submission?: Submission;
  presenter: Presenter | null;
  busy: boolean;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [type, setType] = useState<Submission['type']>(s?.type ?? 'Paper'),
    [duration, setDuration] = useState(s?.durationMinutes ?? 8);
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const values = Object.fromEntries(new FormData(e.currentTarget));
        void onSave({ ...values, type, durationMinutes: duration });
      }}
    >
      {s?.helpNote && (
        <div className="soft-note">
          <LifeBuoy size={18} />
          <p>
            <strong>Presenter request</strong>
            <br />
            {s.helpNote}
          </p>
        </div>
      )}
      <Field label="Presentation title">
        <Input name="title" defaultValue={s?.title} required maxLength={400} />
      </Field>
      <div className="form-columns">
        <Field label="Presenter name">
          <Input name="name" defaultValue={p?.name} required maxLength={150} />
        </Field>
        <Field label="Email address">
          <Input
            name="email"
            type="email"
            defaultValue={p?.email}
            required
            maxLength={254}
          />
        </Field>
      </div>
      <Field label="Institution">
        <Input
          name="institution"
          defaultValue={p?.institution}
          required
          maxLength={200}
        />
      </Field>
      <div className="form-columns">
        <Field label="Track">
          <NativeSelect name="track" defaultValue={s?.track ?? tracks[0]}>
            {tracks.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Format">
          <NativeSelect
            value={type}
            onChange={(e) => {
              const t = e.target.value as Submission['type'];
              setType(t);
              setDuration(typeDurations[t]);
            }}
          >
            {Object.keys(typeDurations).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Presentation duration (minutes)">
        <Input
          type="number"
          min={1}
          max={240}
          required
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
      </Field>
      <Field label="Coauthors (optional)">
        <Input name="coauthors" defaultValue={s?.coauthors} maxLength={1000} />
      </Field>
      <Field label="Abstract (optional)">
        <Textarea
          name="abstract"
          defaultValue={s?.abstract}
          maxLength={6000}
          rows={3}
        />
      </Field>
      <Field label="AV requirements (optional)">
        <Input name="avNeeds" defaultValue={s?.avNeeds} maxLength={1000} />
      </Field>
      <div className="modal-actions">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? (
            <Loader2 className="spin" />
          ) : s ? (
            'Save changes'
          ) : (
            'Add submission'
          )}
        </Button>
      </div>
    </form>
  );
}
function BlockForm({
  block: b,
  busy,
  onSave,
  onCancel,
}: {
  block?: Block;
  busy: boolean;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
  onCancel: () => void;
}) {
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(e.currentTarget));
        void onSave({
          ...v,
          presentationMinutes: Number(v.presentationMinutes),
          capacityPerPeriod: Number(v.capacityPerPeriod),
          locked: v.locked === 'on',
        });
      }}
    >
      <Field label="Block title">
        <Input
          name="title"
          defaultValue={b?.title}
          placeholder="e.g. AI and Systems — Session 1"
          required
          maxLength={300}
        />
      </Field>
      <div className="form-columns">
        <Field label="Track">
          <NativeSelect name="track" defaultValue={b?.track ?? tracks[0]}>
            {tracks.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Presentation format">
          <NativeSelect name="type" defaultValue={b?.type ?? 'Paper'}>
            {Object.keys(typeDurations).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Date">
        <Input
          type="date"
          name="date"
          required
          defaultValue={b?.date ?? '2027-05-15'}
        />
      </Field>
      <div className="form-columns">
        <Field label="Start time (Pacific)">
          <Input
            type="time"
            name="start"
            required
            defaultValue={b?.start ?? '10:00'}
          />
        </Field>
        <Field label="End time (Pacific)">
          <Input
            type="time"
            name="end"
            required
            defaultValue={b?.end ?? '10:48'}
          />
        </Field>
      </div>
      <Field label="Room / location">
        <Input
          name="room"
          required
          defaultValue={b?.room}
          placeholder="e.g. Packard 101"
          maxLength={150}
        />
      </Field>
      <div className="form-columns">
        <Field
          label="Slot length (minutes)"
          hint="Must fit the accepted presentation duration."
        >
          <Input
            name="presentationMinutes"
            type="number"
            min={1}
            max={240}
            required
            defaultValue={b?.presentationMinutes ?? 8}
          />
        </Field>
        <Field
          label="Spots at each start time"
          hint="Use more than one for concurrent posters."
        >
          <Input
            name="capacityPerPeriod"
            type="number"
            min={1}
            max={100}
            required
            defaultValue={b?.capacityPerPeriod ?? 1}
          />
        </Field>
      </div>
      <Field label="Session chair (optional)">
        <Input name="chair" defaultValue={b?.chair} maxLength={150} />
      </Field>
      <label className="checkbox-label">
        <input type="checkbox" name="locked" defaultChecked={b?.locked} />
        <span>Close this block to new bookings</span>
      </label>
      <div className="soft-note">
        <ShieldCheck size={17} />
        <p>
          Changes that invalidate confirmed bookings or overlap another block in
          this room will be rejected.
        </p>
      </div>
      <div className="modal-actions">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button disabled={busy} type="submit">
          {busy ? (
            <Loader2 className="spin" />
          ) : b ? (
            'Save block'
          ) : (
            'Create block'
          )}
        </Button>
      </div>
    </form>
  );
}
