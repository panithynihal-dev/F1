import type { QualifyingResult, RaceResult } from '@/api/types';
import type { ConstructorTitle, DriverCareerRecord, DriverTitle } from '@/data/repository';

// Ports of the app's DriverSeasonDetail.kt and ConstructorSeasonDetail.kt.

export type StatsScope = 'season' | 'career';

export interface DriverStats {
  scope: StatsScope;
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
  /** Season only: Jolpica records fastest laps from 2004, so a career figure would undercount. */
  fastestLaps?: number;
  titleRuns: TitleRun[];
}

/** The titles one driver won with one team — so seven titles don't read as seven for today's team. */
export interface TitleRun {
  teamName: string;
  seasons: number[];
}

const isPodium = (position: string) => {
  const p = Number(position);
  return p >= 1 && p <= 3;
};

export function buildDriverSeasonStats(
  results: RaceResult[],
  qualifying: QualifyingResult[],
  sprints: RaceResult[],
  titles: DriverTitle[],
  driverId: string,
): DriverStats {
  const season = new Date().getUTCFullYear();
  return {
    scope: 'season',
    starts: results.length,
    wins: results.filter((r) => r.position === '1').length,
    podiums: results.filter((r) => isPodium(r.position)).length,
    // A sprint weekend's pole is the sprint grid's first slot.
    poles: qualifying.filter((q) => q.position === '1').length + sprints.filter((s) => s.grid === '1').length,
    fastestLaps: results.filter((r) => r.FastestLap?.rank === '1').length,
    titleRuns: buildTitleRuns(titles.filter((t) => t.season === season), driverId),
  };
}

export function buildDriverCareerStats(record: DriverCareerRecord, titles: DriverTitle[], driverId: string): DriverStats {
  return { scope: 'career', ...record, titleRuns: buildTitleRuns(titles, driverId) };
}

export function buildTitleRuns(titles: DriverTitle[], driverId: string): TitleRun[] {
  const runs = new Map<string, number[]>();
  for (const title of [...titles].sort((a, b) => a.season - b.season)) {
    if (title.driverId !== driverId) continue;
    const team = title.constructors.map((c) => c.name).join(', ');
    runs.set(team, [...(runs.get(team) ?? []), title.season]);
  }
  return [...runs].map(([teamName, seasons]) => ({ teamName, seasons }));
}

export const titleCount = (runs: TitleRun[]) => runs.reduce((sum, run) => sum + run.seasons.length, 0);

export interface ConstructorStats {
  scope: StatsScope;
  wins: number;
  constructorsTitles: number[];
  driversTitles: DriverTitle[];
  /** Season only: qualifying records start in 1994, so an all-time pole count omits four decades. */
  poles?: number;
  /** Career only. */
  starts?: number;
}

export function buildConstructorStats(params: {
  scope: StatsScope;
  constructorId: string;
  wins: number;
  constructorTitles: ConstructorTitle[];
  driverTitles: DriverTitle[];
  poles?: number;
  starts?: number;
}): ConstructorStats {
  const { scope, constructorId, wins, poles, starts } = params;
  const season = new Date().getUTCFullYear();
  const inScope = <T extends { season: number }>(list: T[]) => (scope === 'season' ? list.filter((t) => t.season === season) : list);
  return {
    scope,
    wins,
    poles,
    starts,
    constructorsTitles: inScope(params.constructorTitles)
      .filter((t) => t.constructorId === constructorId)
      .map((t) => t.season),
    driversTitles: inScope(params.driverTitles).filter((t) => t.constructors.some((c) => c.id === constructorId)),
  };
}
