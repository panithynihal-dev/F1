// The one place the site talks to the network. Mirrors the app's OkHttp setup (NetworkModule.kt):
// at most three requests in flight per host, a 15 second timeout, and a backed-off retry on 429.
// Three is not arbitrary — OpenF1's free tier allows about 3 requests a second and Jolpica starts
// refusing at 6 concurrent.

const MAX_PER_HOST = 3;
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// OpenF1 answers 401 for anything inside a session's live window on the free tier — real-time
// data is a paid feature. Callers treat it as "not available yet", not as a failure.
export const HTTP_LIVE_DATA_RESTRICTED = 401;

export const isLiveRestricted = (error: unknown) =>
  error instanceof ApiError && error.status === HTTP_LIVE_DATA_RESTRICTED;

const inFlight = new Map<string, number>();
const waiting = new Map<string, (() => void)[]>();

async function acquire(host: string) {
  if ((inFlight.get(host) ?? 0) < MAX_PER_HOST) {
    inFlight.set(host, (inFlight.get(host) ?? 0) + 1);
    return;
  }
  await new Promise<void>((resolve) => {
    const queue = waiting.get(host) ?? [];
    queue.push(resolve);
    waiting.set(host, queue);
  });
}

function release(host: string) {
  const next = waiting.get(host)?.shift();
  if (next) {
    next();
  } else {
    inFlight.set(host, (inFlight.get(host) ?? 1) - 1);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getJson<T>(url: string): Promise<T> {
  const host = new URL(url).host;
  await acquire(host);
  try {
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(url, { signal: controller.signal });
      } catch {
        throw new ApiError('Network error. Check your connection and try again.');
      } finally {
        clearTimeout(timer);
      }

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        await sleep(retryAfter > 0 ? retryAfter * 1000 : BASE_BACKOFF_MS * (attempt + 1));
        continue;
      }
      if (!response.ok) {
        throw new ApiError(`The data service answered with an error (${response.status}).`, response.status);
      }
      try {
        return (await response.json()) as T;
      } catch {
        throw new ApiError('The data service sent a response this site could not read.');
      }
    }
  } finally {
    release(host);
  }
}

export function buildUrl(base: string, path: string, params: Record<string, string | number | undefined> = {}) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    // OpenF1's date filters are keyed "date>" and "date<" — the operator is part of the key, so
    // "date%3E=2026-03-08T04:10:00" is the encoded form of "date>=…". Verified live.
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `${base}${path}${query ? `?${query}` : ''}`;
}
