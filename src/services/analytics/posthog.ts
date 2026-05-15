import PostHog from 'posthog-react-native';

/**
 * PostHog analytics singleton.
 *
 * To activate: replace POSTHOG_API_KEY with your project API key from
 * app.posthog.com → Project Settings → Project API key.
 * The host below is PostHog Cloud EU; change to https://app.posthog.com for US.
 *
 * Until a real key is provided, all calls are no-ops (PostHog silently drops
 * events when the key is the placeholder value).
 */
const POSTHOG_API_KEY = 'phc_m285kK8UJNUz9wKeY6mpZG8FEPHpJuuABP9GLUmfmdYA';
const POSTHOG_HOST    = 'https://us.i.posthog.com';

let _client: PostHog | null = null;

export function getPostHog(): PostHog | null {
  //if (POSTHOG_API_KEY === 'phc_REPLACE_WITH_YOUR_KEY') return null;
  if (!_client) {
    _client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: __DEV__ ? 1 : 20,
      flushInterval: __DEV__ ? 100 : 30_000,
      // Feature flags not used — disable to avoid a 401 on every init
      preloadFeatureFlags: false,
    });
  }
  return _client;
}

export function identifyUser(uid: string, email?: string): void {
  const ph = getPostHog();
  if (!ph) return;
  ph.identify(uid, email ? { email } : undefined);
}

export function resetAnalyticsUser(): void {
  const ph = getPostHog();
  if (!ph) return;
  ph.reset();
}

export function capture(event: string, properties?: Record<string, any>): void {
  const ph = getPostHog();
  if (!ph) return;
  ph.capture(event, properties);
}
