import { ApiError, buildUrl, getJson } from './http';
import type {
  CarLocation,
  Driver,
  DriverPosition,
  Lap,
  Meeting,
  PitStopEvent,
  RaceControlMessage,
  RaceInterval,
  Session,
  Stint,
} from './types';

// OpenF1 — keyless. session_key also accepts the literal "latest".
const BASE = 'https://api.openf1.org/v1/';

// A query that matches nothing comes back as 404 {"detail":"No results found."} rather than an
// empty array (verified live). For a list endpoint that is simply "none yet".
async function list<T>(path: string, params: Record<string, string | number | undefined>): Promise<T[]> {
  try {
    return await getJson<T[]>(buildUrl(BASE, path, params));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return [];
    throw error;
  }
}

type Key = string | number;

export const openF1 = {
  meetings: (year: number) => list<Meeting>('meetings', { year }),
  sessionsForMeeting: (meetingKey: Key) => list<Session>('sessions', { meeting_key: meetingKey }),
  sessionsForYear: (year: number) => list<Session>('sessions', { year }),
  session: (sessionKey: Key) => list<Session>('sessions', { session_key: sessionKey }),
  positions: (sessionKey: Key) => list<DriverPosition>('position', { session_key: sessionKey }),
  intervals: (sessionKey: Key) => list<RaceInterval>('intervals', { session_key: sessionKey }),
  pitStops: (sessionKey: Key) => list<PitStopEvent>('pit', { session_key: sessionKey }),
  raceControl: (sessionKey: Key) => list<RaceControlMessage>('race_control', { session_key: sessionKey }),
  drivers: (sessionKey: Key) => list<Driver>('drivers', { session_key: sessionKey }),
  laps: (sessionKey: Key) => list<Lap>('laps', { session_key: sessionKey }),
  stints: (sessionKey: Key) => list<Stint>('stints', { session_key: sessionKey }),
  // Always pair with a tight window: a full race is 300k+ samples and OpenF1 rejects asking for
  // it in one go (422).
  locations: (sessionKey: Key, from: string, to: string) =>
    list<CarLocation>('location', { session_key: sessionKey, 'date>': from, 'date<': to }),
};
