import { createStore, del, get, keys, set } from 'idb-keyval';

import { HTTP_LIVE_DATA_RESTRICTED, ApiError } from '@/api/http';

// Port of the app's Room cache (F1Repository.cached). Cache-aside: a fresh-enough entry skips the
// network entirely; otherwise fetch and write through; if the network fails, fall back to whatever
// is stored, however old — a flaky connection should never leave a page worse off than a cache
// that already had the answer.
//
// IndexedDB rather than localStorage: a single finished race's laps, positions and race-control log
// approach a megabyte, and localStorage's ~5MB quota would be gone in a handful of replays.

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

// How long each kind of data stays fresh, chosen per how often it actually changes.
export const TTL = {
  standings: 10 * MINUTE,
  driverSeasonResults: 10 * MINUTE,
  sessionTimeline: HOUR,
  schedule: 6 * HOUR,
  allTime: DAY,
  permanent: Number.POSITIVE_INFINITY,
} as const;

// Entries older than this are swept on start-up, matching the app's one-year retention.
const MAX_AGE = 365 * DAY;

interface Entry<T> {
  value: T;
  fetchedAt: number;
}

const store = typeof indexedDB === 'undefined' ? undefined : createStore('trackimetrix', 'responses');
const memory = new Map<string, Entry<unknown>>();
const pending = new Map<string, Promise<unknown>>();

async function read<T>(key: string): Promise<Entry<T> | undefined> {
  const hot = memory.get(key) as Entry<T> | undefined;
  if (hot || !store) return hot;
  try {
    const cold = await get<Entry<T>>(key, store);
    if (cold) memory.set(key, cold);
    return cold;
  } catch {
    return undefined;
  }
}

function write<T>(key: string, entry: Entry<T>) {
  memory.set(key, entry);
  if (!store) return;
  // A full disk or a private window only costs the next visit its head start.
  set(key, entry, store).catch(() => {});
}

export interface CacheOptions<T> {
  ttl: number;
  // For "come back later" answers — an undecided champion, an unclassified race — which must not
  // be locked in.
  shouldPersist?: (value: T) => boolean;
}

export async function cached<T>(key: string, fetcher: () => Promise<T>, { ttl, shouldPersist }: CacheOptions<T>): Promise<T> {
  const entry = await read<T>(key);
  if (entry && Date.now() - entry.fetchedAt < ttl) return entry.value;

  // Two components asking for the same thing at once share one request.
  const inFlight = pending.get(key) as Promise<T> | undefined;
  if (inFlight) return inFlight;

  const request = (async () => {
    try {
      const fresh = await fetcher();
      if (!shouldPersist || shouldPersist(fresh)) write(key, { value: fresh, fetchedAt: Date.now() });
      return fresh;
    } catch (error) {
      // A session that has just gone live is a real change of state, not a blip; hiding it behind
      // stale pre-live data would stop the page ever showing the restriction.
      const liveRestricted = error instanceof ApiError && error.status === HTTP_LIVE_DATA_RESTRICTED;
      if (entry && !liveRestricted) return entry.value;
      throw error;
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, request);
  return request;
}

export async function sweepExpired() {
  if (!store) return;
  try {
    const now = Date.now();
    for (const key of await keys<string>(store)) {
      const entry = await get<Entry<unknown>>(key, store);
      if (!entry || now - entry.fetchedAt > MAX_AGE) await del(key, store);
    }
  } catch {
    // Housekeeping only.
  }
}
