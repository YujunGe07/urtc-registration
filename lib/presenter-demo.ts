import {
  seedState,
  makePeriods,
  type PortalData,
  type SchedulerState,
} from './scheduler';
import { applyAction } from './scheduler-actions';
const key = 'urtc-presenter-demo-v1';
function fresh() {
  const state = structuredClone(seedState);
  state.submissions[0].key = 'URTC-DEMO-2027';
  state.submissions = state.submissions.filter((s) => s.id === 's-201');
  state.presenters = state.presenters.filter((p) => p.id === 'p-maya');
  state.blocks = state.blocks.filter((b) => b.track === 'AI and Systems');
  state.log = [];
  return state;
}
export function resetDemo() {
  sessionStorage.removeItem(key);
  sessionStorage.removeItem('urtc-demo-active');
}
export async function demoApi(
  action?: Record<string, unknown>,
): Promise<PortalData> {
  let state: SchedulerState = fresh();
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) state = JSON.parse(saved) as SchedulerState;
  } catch {
    sessionStorage.removeItem(key);
  }
  if (action?.kind === 'logout') {
    sessionStorage.removeItem('urtc-demo-active');
    return {
      state: { presenters: [], submissions: [], blocks: [], log: [] },
      revision: 0,
      organizer: false,
      signedIn: false,
      email: '',
      submissionId: null,
      occupancy: {},
    };
  }
  if (action?.kind === 'login') {
    if (String(action.key).trim().toUpperCase() !== 'URTC-DEMO-2027')
      throw new Error('Use URTC-DEMO-2027 for this sample walkthrough.');
    sessionStorage.setItem('urtc-demo-active', 'yes');
  } else if (action) {
    if (sessionStorage.getItem('urtc-demo-active') !== 'yes')
      throw new Error('Enter the demo key to begin.');
    if (
      !['update-contact', 'book', 'cancel', 'help'].includes(
        String(action.kind),
      )
    )
      throw new Error('The presenter demo cannot change organizer records.');
    state = applyAction(state, action, {
      organizer: false,
      submissionId: 's-201',
      email: '',
    });
    sessionStorage.setItem(key, JSON.stringify(state));
  }
  const occupancy: Record<string, number> = {};
  for (const b of state.blocks)
    for (const p of makePeriods(b)) occupancy[p.id] = 0;
  return {
    state,
    revision: 0,
    organizer: false,
    signedIn: false,
    email: '',
    submissionId: 's-201',
    occupancy,
  };
}
