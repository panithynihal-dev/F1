import { buildUrl, getJson } from './http';
import type {
  ConstructorStanding,
  DriverStanding,
  MRData,
  QualifyingResult,
  RaceResult,
  RaceSchedule,
  RaceWithResults,
} from './types';

// Jolpica — Ergast's successor, keyless. Each call unwraps the MRData envelope so callers get the
// list they asked for.
const BASE = 'https://api.jolpi.ca/ergast/f1/';

type StandingsTable<K extends string, T> = { StandingsTable: { StandingsLists: Record<K, T[]>[] } };
type RaceTable<T> = { RaceTable: { Races: T[] } };

const get = <T>(path: string, params?: Record<string, string | number>) => getJson<MRData<T>>(buildUrl(BASE, path, params));

const driverStandings = async (season: string) =>
  (await get<StandingsTable<'DriverStandings', DriverStanding>>(`${season}/driverStandings.json`)).MRData
    .StandingsTable.StandingsLists[0]?.DriverStandings ?? [];

const constructorStandings = async (season: string) =>
  (await get<StandingsTable<'ConstructorStandings', ConstructorStanding>>(`${season}/constructorStandings.json`))
    .MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];

const races = async (path: string) =>
  (await get<RaceTable<RaceWithResults>>(path, { limit: 100 })).MRData.RaceTable.Races;

// Every response carries the size of the full result set in MRData.total, so asking for one row
// and reading the total is a complete all-time count in a single request.
const count = async (path: string) => Number((await get<unknown>(path, { limit: 1 })).MRData.total) || 0;

export const jolpica = {
  driverStandings,
  constructorStandings,
  schedule: async (season = 'current') =>
    (await get<RaceTable<RaceSchedule>>(`${season}.json`, { limit: 100 })).MRData.RaceTable.Races,
  raceResults: async (season: string, round: string): Promise<RaceResult[]> =>
    (await races(`${season}/${round}/results.json`))[0]?.Results ?? [],
  qualifyingResults: async (season: string, round: string): Promise<QualifyingResult[]> =>
    (await races(`${season}/${round}/qualifying.json`))[0]?.QualifyingResults ?? [],
  sprintResults: async (season: string, round: string): Promise<RaceResult[]> =>
    (await races(`${season}/${round}/sprint.json`))[0]?.SprintResults ?? [],

  driverResults: async (season: string, driverId: string) =>
    (await races(`${season}/drivers/${driverId}/results.json`)).flatMap((r) => r.Results ?? []),
  driverQualifying: async (season: string, driverId: string) =>
    (await races(`${season}/drivers/${driverId}/qualifying.json`)).flatMap((r) => r.QualifyingResults ?? []),
  // A sprint weekend's pole is the sprint result's grid slot; there is no sprint-qualifying resource.
  driverSprints: async (season: string, driverId: string) =>
    (await races(`${season}/drivers/${driverId}/sprint.json`)).flatMap((r) => r.SprintResults ?? []),
  driverRaces: (season: string, driverId: string) => races(`${season}/drivers/${driverId}/results.json`),
  constructorRaces: (season: string, constructorId: string) => races(`${season}/constructors/${constructorId}/results.json`),
  constructorResults: async (season: string, constructorId: string) =>
    (await races(`${season}/constructors/${constructorId}/results.json`)).flatMap((r) => r.Results ?? []),
  constructorQualifying: async (season: string, constructorId: string) =>
    (await races(`${season}/constructors/${constructorId}/qualifying.json`)).flatMap((r) => r.QualifyingResults ?? []),

  // The season is not optional: Jolpica 400s on the unscoped form classic Ergast answered.
  // Asked mid-season this returns whoever is *leading*, so callers only ask about decided seasons.
  seasonDriverChampion: async (season: number) =>
    (await get<StandingsTable<'DriverStandings', DriverStanding>>(`${season}/driverStandings/1.json`)).MRData
      .StandingsTable.StandingsLists.flatMap((list) => list.DriverStandings)[0] ?? null,
  seasonConstructorChampion: async (season: number) =>
    (await get<StandingsTable<'ConstructorStandings', ConstructorStanding>>(`${season}/constructorStandings/1.json`))
      .MRData.StandingsTable.StandingsLists.flatMap((list) => list.ConstructorStandings)[0] ?? null,

  constructorFinishCount: (constructorId: string, position: number) => count(`constructors/${constructorId}/results/${position}.json`),
  constructorRaceCount: (constructorId: string) => count(`constructors/${constructorId}/races.json`),
  driverFinishCount: (driverId: string, position: number) => count(`drivers/${driverId}/results/${position}.json`),
  driverQualifyingCount: (driverId: string, position: number) => count(`drivers/${driverId}/qualifying/${position}.json`),
  driverRaceCount: (driverId: string) => count(`drivers/${driverId}/races.json`),
};
