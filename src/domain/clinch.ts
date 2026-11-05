import type { RaceSchedule } from '@/api/types';

import { raceStart } from './dates';

// The most one driver, or one team's two cars, can score from a single event under the current
// points system: a Grand Prix win and a sprint win (for a team, first and second).
const MAX = {
  drivers: { race: 25, sprint: 8 },
  constructors: { race: 25 + 18, sprint: 8 + 7 },
} as const;

export type Championship = keyof typeof MAX;

/**
 * Points still on offer in the season: every Grand Prix that hasn't started, plus every sprint that
 * hasn't, counted on its own so a sprint weekend whose sprint already ran only offers the race.
 */
export function maxPointsLeft(schedule: RaceSchedule[], championship: Championship, now: number) {
  const { race, sprint } = MAX[championship];
  return schedule.reduce((sum, r) => {
    const raceLeft = (raceStart(r) ?? 0) > now ? race : 0;
    const sprintLeft = r.Sprint && (raceStart(r.Sprint) ?? 0) > now ? sprint : 0;
    return sum + raceLeft + sprintLeft;
  }, 0);
}

export const racesLeft = (schedule: RaceSchedule[], now: number) => schedule.filter((r) => (raceStart(r) ?? 0) > now).length;

/**
 * Whether the leader can no longer be caught: their lead is bigger than everything still on offer.
 * Strictly bigger, because a tie on points is broken on countback (most wins, then most seconds…),
 * which standings alone can't settle, so an exactly-equal lead stays open.
 *
 * This is a statement about the arithmetic, not the record books: career title counts elsewhere on
 * the site still wait for the season to end.
 */
export function isClinched(points: number[], left: number) {
  const [leader = 0, second = 0] = [...points].sort((a, b) => b - a);
  return points.length > 0 && leader - second > left;
}
