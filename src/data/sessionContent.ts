import { jolpica } from '@/api/jolpica';
import { isLiveRestricted } from '@/api/http';
import type { Driver, Lap, QualifyingResult, RaceResult, RaceSchedule, Session } from '@/api/types';
import { meetingEnd, meetingStart, utcDay } from '@/domain/dates';

import { cached, TTL } from './cache';
import { getDrivers, getLaps, getMeetings, getRaceResults, getQualifyingResults, getSchedule, isSessionFinished } from './repository';

// What one session's results page shows. Port of SessionDetailViewModel, extended: the app showed
// lap times for everything but a race, while qualifying and sprints have official classifications
// of their own on Jolpica, which are the real answer to "who won it".

export interface DriverLapSummary {
  driverNumber: number;
  name: string;
  teamName?: string | null;
  teamColour?: string | null;
  bestLap: number | null;
  laps: number;
}

export type SessionContent =
  | { kind: 'race' | 'sprint'; race: RaceSchedule; results: RaceResult[] }
  | { kind: 'qualifying'; race: RaceSchedule; results: QualifyingResult[] }
  /**
   * `provisional` marks a race, sprint or qualifying whose classification isn't published yet: the
   * rows are then ordered by fastest lap, which is not the finishing order and must not read as one.
   */
  | { kind: 'laps'; summaries: DriverLapSummary[]; provisional: boolean }
  | { kind: 'liveRestricted' };

export const isRaceSession = (s: Session) => s.session_name === 'Race';
export const isSprintSession = (s: Session) => s.session_name === 'Sprint';
export const isQualifyingSession = (s: Session) => s.session_name === 'Qualifying';

/**
 * The Jolpica round a session belongs to. The APIs share no ID, so the join is by calendar: the
 * round whose race day falls inside the session's meeting (a weekend runs Friday to Sunday, and a
 * Saturday qualifying has to land on Sunday's round).
 */
export async function roundForSession(session: Session): Promise<RaceSchedule | null> {
  const [schedule, meetings] = await Promise.all([getSchedule(), getMeetings(session.year)]);
  const meeting = meetings.find((m) => m.meeting_key === session.meeting_key);
  const start = meeting && meetingStart(meeting);
  if (start == null) return null;
  const from = utcDay(start);
  const to = utcDay(meetingEnd(meeting!) ?? start);
  return schedule.find((race) => race.date >= from && race.date <= to) ?? null;
}

const getSprintResults = (season: string, round: string) =>
  cached(`sprint_results_${season}_${round}`, () => jolpica.sprintResults(season, round), {
    ttl: TTL.permanent,
    shouldPersist: (results) => results.length > 0,
  });

export async function getSessionContent(session: Session): Promise<SessionContent> {
  const classified = isRaceSession(session) || isSprintSession(session) || isQualifyingSession(session);
  if (classified) {
    const race = await roundForSession(session);
    if (race) {
      if (isQualifyingSession(session)) {
        const results = await getQualifyingResults(race.season, race.round);
        if (results.length) return { kind: 'qualifying', race, results };
      } else {
        const results = isRaceSession(session) ? await getRaceResults(race.season, race.round) : await getSprintResults(race.season, race.round);
        if (results.length) return { kind: isRaceSession(session) ? 'race' : 'sprint', race, results };
      }
    }
  }
  try {
    const finished = isSessionFinished(session);
    const [drivers, laps] = await Promise.all([getDrivers(session.session_key, finished), getLaps(session.session_key, finished)]);
    return { kind: 'laps', summaries: buildLapSummaries(drivers, laps), provisional: classified };
  } catch (error) {
    // OpenF1's free tier withholds a session while it is live; that's a state, not a failure.
    if (isLiveRestricted(error)) return { kind: 'liveRestricted' };
    throw error;
  }
}

export function buildLapSummaries(drivers: Driver[], laps: Lap[]): DriverLapSummary[] {
  const byDriver = new Map<number, Lap[]>();
  for (const lap of laps) byDriver.set(lap.driver_number, [...(byDriver.get(lap.driver_number) ?? []), lap]);
  return drivers
    .map((driver) => {
      const completed = (byDriver.get(driver.driver_number) ?? []).filter((lap) => lap.lap_duration != null);
      return {
        driverNumber: driver.driver_number,
        name: driver.full_name ? titleCaseSurname(driver) : driver.broadcast_name ?? `#${driver.driver_number}`,
        teamName: driver.team_name,
        teamColour: driver.team_colour,
        bestLap: completed.length ? Math.min(...completed.map((lap) => lap.lap_duration!)) : null,
        laps: completed.length,
      };
    })
    .sort((a, b) => (a.bestLap ?? Infinity) - (b.bestLap ?? Infinity));
}

/** OpenF1's full_name shouts the surname ("Max VERSTAPPEN"); first and last name come properly cased. */
export function titleCaseSurname(driver: Driver) {
  if (driver.first_name && driver.last_name) return `${driver.first_name} ${driver.last_name}`;
  return driver.last_name ?? driver.full_name ?? `#${driver.driver_number}`;
}
