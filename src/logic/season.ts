import type { RaceResult, RaceWithResults } from '@/api/types';

export interface RoundPoints {
  round: string;
  name: string;
  points: number;
}

const shortName = (name: string) => name.replace(' Grand Prix', ' GP');

/**
 * Points per round, Grand Prix plus that weekend's sprint, so the running total matches the
 * championship table. `pick` chooses whose results count: one driver, or both cars of a team.
 */
export function pointsByRound(races: RaceWithResults[], sprints: RaceWithResults[], pick: (r: RaceResult) => boolean): RoundPoints[] {
  const sprintPoints = new Map(sprints.map((s) => [s.round, (s.SprintResults ?? []).filter(pick).reduce((sum, r) => sum + Number(r.points), 0)]));
  return races.map((race) => ({
    round: race.round,
    name: shortName(race.raceName),
    points: (race.Results ?? []).filter(pick).reduce((sum, r) => sum + Number(r.points), 0) + (sprintPoints.get(race.round) ?? 0),
  }));
}

export const isClassifiedResult = (r: RaceResult) => /^\d+$/.test(r.positionText);

/** Season numbers for one driver from their race results. */
export function driverSeasonNumbers(races: RaceWithResults[], driverId: string) {
  const mine = races.flatMap((r) => (r.Results ?? []).filter((x) => x.Driver.driverId === driverId));
  return {
    podiums: mine.filter((r) => isClassifiedResult(r) && Number(r.position) <= 3).length,
    poles: mine.filter((r) => r.grid === '1').length,
    fastestLaps: mine.filter((r) => r.FastestLap?.rank === '1').length,
  };
}

export interface HeadToHeadRow {
  label: string;
  a: number;
  b: number;
}

/**
 * Two team-mates against each other: who out-qualified whom, who finished ahead (when both were
 * classified), and their points, wins and podiums. Only rounds where both took part count.
 */
export function teammateHeadToHead(
  aId: string,
  bId: string,
  qualifying: RaceWithResults[],
  races: RaceWithResults[],
  points: { a: number; b: number },
): HeadToHeadRow[] {
  let qa = 0;
  let qb = 0;
  for (const round of qualifying) {
    const q = round.QualifyingResults ?? [];
    const a = q.find((r) => r.Driver.driverId === aId);
    const b = q.find((r) => r.Driver.driverId === bId);
    if (a && b) {
      if (Number(a.position) < Number(b.position)) qa++;
      else qb++;
    }
  }
  let ra = 0;
  let rb = 0;
  let wa = 0;
  let wb = 0;
  let pa = 0;
  let pb = 0;
  for (const round of races) {
    const res = round.Results ?? [];
    const a = res.find((r) => r.Driver.driverId === aId);
    const b = res.find((r) => r.Driver.driverId === bId);
    if (a && isClassifiedResult(a)) {
      if (a.position === '1') wa++;
      if (Number(a.position) <= 3) pa++;
    }
    if (b && isClassifiedResult(b)) {
      if (b.position === '1') wb++;
      if (Number(b.position) <= 3) pb++;
    }
    if (a && b) {
      if (Number(a.position) < Number(b.position)) ra++;
      else rb++;
    }
  }
  return [
    { label: 'Qualifying', a: qa, b: qb },
    { label: 'Race finishes', a: ra, b: rb },
    { label: 'Points', a: points.a, b: points.b },
    { label: 'Wins', a: wa, b: wb },
    { label: 'Podiums', a: pa, b: pb },
  ];
}
