import type { RaceSchedule } from '@/api/types';

import { raceStart } from './dates';

export interface WeekendSession {
  name: string;
  start: number | null;
  /** Jolpica sometimes publishes a day before it publishes a time. */
  hasTime: boolean;
}

/** A race weekend's sessions in running order — a sprint weekend swaps FP2/FP3 for the sprint pair. */
export function weekendSessions(race: RaceSchedule): WeekendSession[] {
  const entries: [string, { date: string; time?: string } | undefined][] = [
    ['Practice 1', race.FirstPractice],
    ['Practice 2', race.SecondPractice],
    ['Practice 3', race.ThirdPractice],
    ['Sprint qualifying', race.SprintQualifying],
    ['Sprint', race.Sprint],
    ['Qualifying', race.Qualifying],
    ['Race', { date: race.date, time: race.time }],
  ];
  return entries
    .filter((entry): entry is [string, { date: string; time?: string }] => entry[1] != null)
    .map(([name, time]) => ({ name, start: raceStart(time), hasTime: Boolean(time.time) }))
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
}

export const isSprintWeekend = (race: RaceSchedule) => race.Sprint != null;

export type SessionState = 'done' | 'next' | 'upcoming';

/**
 * The weekend's sessions with where each stands right now. The schedule carries no end times, so a
 * session counts as done from the moment it starts.
 */
export function weekendProgress(race: RaceSchedule, now: number): (WeekendSession & { state: SessionState })[] {
  const sessions = weekendSessions(race);
  const nextIndex = sessions.findIndex((s) => (s.start ?? 0) > now);
  return sessions.map((s, i) => ({ ...s, state: i === nextIndex ? 'next' : s.start != null && s.start <= now ? 'done' : 'upcoming' }));
}
