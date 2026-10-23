import type { Driver, DriverPosition, PitStopEvent, RaceInterval, Stint } from '@/api/types';

import { parseInstant } from './dates';

// Port of the app's viewmodel/DriverRowBuilder.kt, re-ranked as of a moment in the replay so the
// order changes when the recorded data shows an overtake.

export interface LiveDriverRow {
  driverNumber: number;
  acronym: string;
  name: string;
  teamName?: string | null;
  teamColour?: string | null;
  position: number | null;
  gapToLeader: number | string | null;
  interval: number | string | null;
  isPitting: boolean;
  compound: string | null;
}

const DEFAULT_PIT_STOP_SECONDS = 25;

/** Rows parsed once per window; `rowsAt` is then cheap enough to call several times a second. */
export interface LeaderboardSource {
  drivers: Driver[];
  positions: { driver: number; t: number; position: number }[];
  intervals: { driver: number; t: number; gap: number | string | null; interval: number | string | null }[];
  pits: { driver: number; from: number; to: number }[];
  stints: Stint[];
}

export function prepareLeaderboard(
  drivers: Driver[],
  positions: DriverPosition[],
  intervals: RaceInterval[],
  pitStops: PitStopEvent[],
  stints: Stint[],
): LeaderboardSource {
  const timed = <T extends { date: string }, R>(items: T[], map: (item: T, t: number) => R) =>
    items.flatMap((item) => {
      const t = parseInstant(item.date);
      return t == null ? [] : [map(item, t)];
    });
  return {
    drivers,
    positions: timed(positions, (p, t) => ({ driver: p.driver_number, t, position: p.position })).sort((a, b) => a.t - b.t),
    intervals: timed(intervals, (i, t) => ({ driver: i.driver_number, t, gap: i.gap_to_leader ?? null, interval: i.interval ?? null })).sort(
      (a, b) => a.t - b.t,
    ),
    pits: timed(pitStops, (p, t) => {
      const seconds = p.lane_duration ?? p.pit_duration ?? DEFAULT_PIT_STOP_SECONDS;
      return { driver: p.driver_number, from: t - seconds * 1000, to: t };
    }),
    stints,
  };
}

/** Latest entry per driver at or before `at`, from a list sorted by time. */
function latestBy<T extends { driver: number; t: number }>(items: T[], at: number) {
  const out = new Map<number, T>();
  for (const item of items) {
    if (item.t > at) break;
    out.set(item.driver, item);
  }
  return out;
}

export function rowsAt(source: LeaderboardSource, at: number, currentLap: number): LiveDriverRow[] {
  const positions = latestBy(source.positions, at);
  const intervals = latestBy(source.intervals, at);
  const pitting = new Set(source.pits.filter((p) => at >= p.from && at <= p.to).map((p) => p.driver));
  return source.drivers
    .map((d) => {
      const interval = intervals.get(d.driver_number);
      // The tyre on the car *now* — the app showed each driver's last stint of the whole race.
      const stint = source.stints
        .filter((s) => s.driver_number === d.driver_number && (s.lap_start ?? 0) <= currentLap)
        .sort((a, b) => b.stint_number - a.stint_number)[0];
      return {
        driverNumber: d.driver_number,
        acronym: d.name_acronym ?? String(d.driver_number),
        name: d.last_name ?? d.broadcast_name ?? `#${d.driver_number}`,
        teamName: d.team_name,
        teamColour: d.team_colour,
        position: positions.get(d.driver_number)?.position ?? null,
        gapToLeader: interval?.gap ?? null,
        interval: interval?.interval ?? null,
        isPitting: pitting.has(d.driver_number),
        compound: stint?.compound ?? null,
      };
    })
    .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
}

/** "+3.214", "+1 LAP" or "–". */
export function formatGap(value: number | string | null) {
  if (value == null) return '–';
  if (typeof value === 'number') return `+${value.toFixed(3)}`;
  return value.startsWith('+') ? value : `+${value}`;
}
