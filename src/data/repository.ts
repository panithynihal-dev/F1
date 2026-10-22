import { jolpica } from '@/api/jolpica';
import { openF1 } from '@/api/openf1';
import type { ConstructorStanding, DriverStanding, Meeting, RaceResult, RaceSchedule, Session } from '@/api/types';
import { meetingEnd, meetingStart, raceStart, sessionEnd, sessionStart, utcDay } from '@/domain/dates';

import { cached, TTL } from './cache';
import baked from './champions.json';

// Port of the app's data/repository/F1Repository.kt. Every function caches with the same keys and
// lifetimes the app used, so the reasoning in its comments still holds here.

const currentYear = () => new Date().getUTCFullYear();

// ---- Schedule, standings, results (Jolpica) ----

export const getSchedule = () => cached('schedule', () => jolpica.schedule('current'), { ttl: TTL.schedule });

export const getDriverStandings = () => cached('driver_standings', () => jolpica.driverStandings('current'), { ttl: TTL.standings });

export const getConstructorStandings = () =>
  cached('constructor_standings', () => jolpica.constructorStandings('current'), { ttl: TTL.standings });

/** The next race that hasn't started; once the season is over, the last one on the calendar. */
export const nextRace = (races: RaceSchedule[], now = Date.now()) =>
  races
    .filter((race) => (raceStart(race) ?? 0) > now)
    .sort((a, b) => (raceStart(a) ?? 0) - (raceStart(b) ?? 0))[0] ?? races[races.length - 1] ?? null;

export const lastStartedRace = (races: RaceSchedule[], now = Date.now()) =>
  races
    .filter((race) => (raceStart(race) ?? Infinity) < now)
    .sort((a, b) => (raceStart(b) ?? 0) - (raceStart(a) ?? 0))[0] ?? null;

export interface LastRaceResults {
  raceName: string;
  round: string;
  season: string;
  podium: RaceResult[];
}

/**
 * The most recent round's podium, or null before the first race and in the gap between the flag
 * and the classification being published. Keyed by round, so next week's race gets its own entry.
 */
export async function getLastRaceResults(): Promise<LastRaceResults | null> {
  const race = lastStartedRace(await getSchedule());
  if (!race) return null;
  return cached(
    `last_race_results_${race.season}_${race.round}`,
    async () => {
      const results = await jolpica.raceResults(race.season, race.round);
      return results.length ? { raceName: race.raceName, round: race.round, season: race.season, podium: results.slice(0, 3) } : null;
    },
    { ttl: TTL.permanent, shouldPersist: (value) => value != null },
  );
}

export const getRaceResults = (season: string, round: string) =>
  cached(`race_results_${season}_${round}`, () => jolpica.raceResults(season, round), {
    ttl: TTL.permanent,
    // Empty means "not classified yet", which must not be locked in.
    shouldPersist: (results) => results.length > 0,
  });

export const getQualifyingResults = (season: string, round: string) =>
  cached(`qualifying_results_${season}_${round}`, () => jolpica.qualifyingResults(season, round), {
    ttl: TTL.permanent,
    shouldPersist: (results) => results.length > 0,
  });

/**
 * OpenF1 and Jolpica share no ID; the race day is the only reliable join. An empty list means the
 * race isn't classified yet — a normal state, not a failure.
 */
export async function getRaceResultsForSession(session: Session): Promise<{ race: RaceSchedule | null; results: RaceResult[] }> {
  const start = sessionStart(session);
  if (start == null) return { race: null, results: [] };
  const day = utcDay(start);
  const race = (await getSchedule()).find((r) => r.date === day) ?? null;
  if (!race) return { race: null, results: [] };
  return { race, results: await getRaceResults(race.season, race.round) };
}

// ---- Sessions and meetings (OpenF1) ----

/** The OpenF1 meeting covering a race day — the source of circuit artwork and the local UTC offset. */
export const getMeetingForDate = (date: string) =>
  cached(
    `meeting_for_${date}`,
    async (): Promise<Meeting | null> =>
      (await getMeetings(Number(date.slice(0, 4)))).find((meeting) => {
        const start = meetingStart(meeting);
        if (start == null) return false;
        const end = meetingEnd(meeting) ?? start;
        // A meeting spans the weekend, so the race day falls inside it rather than equalling either end.
        return utcDay(start) <= date && date <= utcDay(end);
      }) ?? null,
    { ttl: TTL.sessionTimeline },
  );

export const getMeetings = (year: number) => cached(`meetings_${year}`, () => openF1.meetings(year), { ttl: TTL.sessionTimeline });

/**
 * Every session of the season that has already started, oldest first, testing excluded. One call
 * for the whole year where the app made one per meeting — OpenF1 accepts `year` on /sessions.
 */
export const getSeasonSessionTimeline = () =>
  cached(
    'session_timeline',
    async () => {
      const now = Date.now();
      const year = currentYear();
      const [meetings, sessions] = await Promise.all([getMeetings(year), openF1.sessionsForYear(year)]);
      const testing = new Set(meetings.filter((m) => /testing/i.test(m.meeting_name)).map((m) => m.meeting_key));
      return sessions
        .filter((s) => !testing.has(s.meeting_key) && (sessionStart(s) ?? Infinity) < now)
        .sort((a, b) => (sessionStart(a) ?? 0) - (sessionStart(b) ?? 0));
    },
    { ttl: TTL.sessionTimeline },
  );

/** Cached for an hour, but a miss is never kept — it means "not published yet". */
export const getSession = (sessionKey: number) =>
  cached(`session_${sessionKey}`, async () => (await openF1.session(sessionKey))[0] ?? null, {
    ttl: TTL.sessionTimeline,
    shouldPersist: (session) => session != null,
  });

export const isSessionFinished = (session: Session) => (sessionEnd(session) ?? Infinity) < Date.now();

// Per-session data. Once a session is over it never changes and is kept for good; a session still
// running is fetched fresh and never stored, or the page would freeze at the moment it was opened.
const sessionData =
  <T>(name: string, fetcher: (key: number) => Promise<T[]>) =>
  (sessionKey: number, finished: boolean) =>
    cached(`${name}_${sessionKey}`, () => fetcher(sessionKey), { ttl: TTL.permanent, shouldPersist: () => finished });

export const getDrivers = sessionData('drivers', openF1.drivers);
export const getLaps = sessionData('laps', openF1.laps);
export const getPositions = sessionData('positions', openF1.positions);
export const getPitStops = sessionData('pit_stops', openF1.pitStops);
export const getRaceControl = sessionData('race_control', openF1.raceControl);
export const getStints = sessionData('stints', openF1.stints);
// /intervals is the biggest call by far (30k rows a race) and is fetched only when the leaderboard
// opens; it is never stored.
export const getIntervals = (sessionKey: number) => openF1.intervals(sessionKey);
export const getCarLocations = (sessionKey: number, from: string, to: string) => openF1.locations(sessionKey, from, to);

// ---- Championship history ----

export interface DriverTitle {
  season: number;
  driverId: string;
  name: string;
  constructors: { id: string; name: string }[];
}
export interface ConstructorTitle {
  season: number;
  constructorId: string;
  name: string;
}

/**
 * Seasons whose title is settled. The current season counts only once its final race has started:
 * asked mid-season, Jolpica returns whoever is leading, which would hand out titles in July.
 */
async function lastDecidedSeason() {
  try {
    const schedule = await getSchedule();
    const finalRound = Math.max(...schedule.map((r) => raceStart(r) ?? 0));
    return finalRound > 0 && finalRound < Date.now() ? currentYear() : currentYear() - 1;
  } catch {
    // The safe direction: under-count by at most the season just gone rather than invent a champion.
    return currentYear() - 1;
  }
}

const seasonsAfterBake = async () => {
  const last = await lastDecidedSeason();
  const seasons: number[] = [];
  for (let s = baked.throughSeason + 1; s <= last; s++) seasons.push(s);
  return seasons;
};

// Each season is cached permanently once decided; a failure fails the whole list rather than
// returning a quietly short one ("Ferrari: 12 titles" reads as fact).
const seasonDriverChampion = (season: number) =>
  cached(`driver_champion_${season}`, () => jolpica.seasonDriverChampion(season), {
    ttl: TTL.permanent,
    shouldPersist: (champion) => champion != null,
  });
const seasonConstructorChampion = (season: number) =>
  cached(`constructor_champion_${season}`, () => jolpica.seasonConstructorChampion(season), {
    ttl: TTL.permanent,
    shouldPersist: (champion) => champion != null,
  });

const toDriverTitle = (season: number, s: DriverStanding): DriverTitle => ({
  season,
  driverId: s.Driver.driverId,
  name: `${s.Driver.givenName} ${s.Driver.familyName}`,
  constructors: s.Constructors.map((c) => ({ id: c.constructorId, name: c.name })),
});
const toConstructorTitle = (season: number, s: ConstructorStanding): ConstructorTitle => ({
  season,
  constructorId: s.Constructor.constructorId,
  name: s.Constructor.name,
});

export async function getDriverTitles(): Promise<DriverTitle[]> {
  const extra = await Promise.all(
    (await seasonsAfterBake()).map(async (season) => {
      const champion = await seasonDriverChampion(season);
      return champion ? [toDriverTitle(season, champion)] : [];
    }),
  );
  return [...(baked.drivers as DriverTitle[]), ...extra.flat()];
}

export async function getConstructorTitles(): Promise<ConstructorTitle[]> {
  const extra = await Promise.all(
    (await seasonsAfterBake()).map(async (season) => {
      const champion = await seasonConstructorChampion(season);
      return champion ? [toConstructorTitle(season, champion)] : [];
    }),
  );
  return [...(baked.constructors as ConstructorTitle[]), ...extra.flat()];
}

// ---- Season and career stats ----

export const getDriverSeasonResults = (driverId: string) =>
  cached(`driver_results_current_${driverId}`, () => jolpica.driverResults('current', driverId), { ttl: TTL.driverSeasonResults });
export const getDriverSeasonQualifying = (driverId: string) =>
  cached(`driver_qualifying_current_${driverId}`, () => jolpica.driverQualifying('current', driverId), { ttl: TTL.driverSeasonResults });
export const getDriverSeasonSprints = (driverId: string) =>
  cached(`driver_sprint_current_${driverId}`, () => jolpica.driverSprints('current', driverId), { ttl: TTL.driverSeasonResults });

export interface DriverCareerRecord {
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
}

/**
 * Career totals from count-only queries, sequential on purpose: five parallel calls per driver,
 * repeated for every driver opened, is the burst that gets a free tier to start refusing. Driver
 * poles are trustworthy (qualifying records begin in 1994, and every current driver debuted after).
 */
export const getDriverCareerRecord = (driverId: string) =>
  cached(
    `driver_career_record_${driverId}`,
    async (): Promise<DriverCareerRecord> => {
      const wins = await jolpica.driverFinishCount(driverId, 1);
      const seconds = await jolpica.driverFinishCount(driverId, 2);
      const thirds = await jolpica.driverFinishCount(driverId, 3);
      const poles = await jolpica.driverQualifyingCount(driverId, 1);
      const starts = await jolpica.driverRaceCount(driverId);
      return { starts, wins, podiums: wins + seconds + thirds, poles };
    },
    { ttl: TTL.allTime },
  );

export const getConstructorSeasonResults = (constructorId: string) =>
  cached(`constructor_results_${currentYear()}_${constructorId}`, () => jolpica.constructorResults(String(currentYear()), constructorId), {
    ttl: TTL.driverSeasonResults,
  });
export const getConstructorSeasonQualifying = (constructorId: string) =>
  cached(
    `constructor_qualifying_${currentYear()}_${constructorId}`,
    () => jolpica.constructorQualifying(String(currentYear()), constructorId),
    { ttl: TTL.driverSeasonResults },
  );

export const getConstructorCareerRecord = (constructorId: string) =>
  cached(
    `constructor_career_record_${constructorId}`,
    async () => {
      const wins = await jolpica.constructorFinishCount(constructorId, 1);
      const starts = await jolpica.constructorRaceCount(constructorId);
      return { wins, starts };
    },
    { ttl: TTL.allTime },
  );

/** This season's races for one driver, round by round — the profile page's results table. */
export const getDriverSeasonRaces = (driverId: string) =>
  cached(`driver_season_races_${driverId}`, () => jolpica.driverRaces('current', driverId), { ttl: TTL.driverSeasonResults });

export const getConstructorSeasonRaces = (constructorId: string) =>
  cached(`constructor_season_races_${constructorId}`, () => jolpica.constructorRaces('current', constructorId), {
    ttl: TTL.driverSeasonResults,
  });
