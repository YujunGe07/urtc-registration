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
let clientPromise:
  | Promise<import('@supabase/supabase-js').SupabaseClient>
  | undefined;
export function authClient() {
  if (!backendConfigured)
    throw new Error(
      'The shared conference backend is not connected yet. The presenter demo is available.',
    );
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(supabaseUrl, supabaseKey, {
      auth: { detectSessionInUrl: true, flowType: 'implicit' },
    }),
  );
  return clientPromise;
}
export async function sendOrganizerLink(email: string) {
  const client = await authClient();
  const redirect = new URL(window.location.pathname, window.location.origin);
  redirect.searchParams.set('role', 'organizer');
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirect.toString() },
  });
  if (error) throw error;
}
export async function organizerSignOut() {
  const client = await authClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
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
  let token: string | undefined;
  if (pagesBuild) {
    const client = await authClient();
    const {
      data: { session },
    } = await client.auth.getSession();
    token = session?.access_token;
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
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
