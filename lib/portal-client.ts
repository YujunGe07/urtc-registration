import type { PortalData } from './scheduler';

export const pagesBuild =
  typeof __URTC_PAGES__ !== 'undefined' && __URTC_PAGES__;
export const supabaseUrl =
  typeof __URTC_SUPABASE_URL__ !== 'undefined' ? __URTC_SUPABASE_URL__ : '';
export const supabaseKey =
  typeof __URTC_SUPABASE_KEY__ !== 'undefined' ? __URTC_SUPABASE_KEY__ : '';
export const backendConfigured = Boolean(supabaseUrl && supabaseKey);
export const DEMO_KEY = 'URTC-DEMO-2027';
const sessionKey = 'urtc-supabase-presenter-session';
const organizerKey = 'urtc-organizer-email-entry';
// Temporary allowlist gate requested for the current review. This does not verify identity.
export async function organizerSignIn(email: string) {
  const normalized = email.trim().toLowerCase();
  const result = await portalApi({
    kind: 'organizer-login',
    email: normalized,
  });
  sessionStorage.setItem(organizerKey, normalized);
  return result;
}
export async function organizerSignOut() {
  sessionStorage.removeItem(organizerKey);
}
export function demoActive() {
  return (
    pagesBuild &&
    typeof window !== 'undefined' &&
    sessionStorage.getItem('urtc-demo-active') === 'yes'
  );
}
export async function resetDemo() {
  const demo = await import('./presenter-demo');
  demo.resetDemo();
}
export async function portalApi(
  action?: Record<string, unknown>,
): Promise<PortalData> {
  if (
    pagesBuild &&
    (demoActive() ||
      (action?.kind === 'login' &&
        String(action.key).trim().toUpperCase() === DEMO_KEY))
  ) {
    const demo = await import('./presenter-demo');
    return demo.demoApi(action);
  }
  if (pagesBuild && !backendConfigured) {
    if (action)
      throw new Error(
        `Real conference sign-in is not connected yet. For the presenter walkthrough, use ${DEMO_KEY}.`,
      );
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
  const response = await fetch(
    pagesBuild ? `${supabaseUrl}/functions/v1/portal` : '/api/portal',
    {
      method: action ? 'POST' : 'GET',
      headers: {
        ...(action ? { 'Content-Type': 'application/json' } : {}),
        ...(pagesBuild
          ? {
              apikey: supabaseKey,
              'X-Presenter-Session': sessionStorage.getItem(sessionKey) ?? '',
              'X-Organizer-Email':
                action?.kind === 'organizer-login'
                  ? typeof action.email === 'string'
                    ? action.email
                    : ''
                  : (sessionStorage.getItem(organizerKey) ?? ''),
            }
          : {}),
      },
      ...(action ? { body: JSON.stringify(action) } : { cache: 'no-store' }),
    },
  );
  const result = (await response.json()) as PortalData & {
    error?: string;
    sessionToken?: string;
  };
  if (!response.ok)
    throw new Error(result.error ?? 'Unable to connect. Please try again.');
  if (pagesBuild && result.sessionToken)
    sessionStorage.setItem(sessionKey, result.sessionToken);
  if (pagesBuild && action?.kind === 'logout')
    sessionStorage.removeItem(sessionKey);
  return result;
}
