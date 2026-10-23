import type { Driver, RaceControlMessage } from '@/api/types';

import { parseInstant } from './dates';
import type { LapMarker } from './trackBuilder';

// Port of the app's viewmodel/RaceIncidents.kt. Only two things can be stated honestly from the
// APIs: that a car has stopped (the lap feed goes quiet — the same evidence that removes it from
// the map) and that race control named a collision. *Why* a car stopped is in neither feed, so no
// caption ever says a driver crashed.

/** How long a caption stays up. */
export const INCIDENT_DISPLAY_MS = 6_000;

// A car must stop starting laps for two minutes, and stand a minute clear of the field's median
// silence — under a safety car everyone's laps stretch together and nobody stands out. Swept over
// eight 2026 races: 28 of 35 retirements caught, no false positives.
const STOPPED_MARGIN_MS = 120_000;
const FIELD_OUTLIER_MS = 60_000;

// "INCIDENT INVOLVING CARS 55 (SAI) AND 23 (ALB)" — each car is found by the acronym after it.
const CAR_WITH_ACRONYM = /(\d+)\s*\(([A-Z]{3})\)/g;
const TURN_NUMBER = /TURN\s+(\d+)/;

export interface RaceIncident {
  showFromMs: number;
  text: string;
  isRetirement: boolean;
}

export function buildRaceIncidents(params: {
  lapMarkers: LapMarker[];
  drivers: Driver[];
  raceControl: RaceControlMessage[];
  windowStart: number;
  durationMs: number;
  lapRange: { first: number; last: number };
  totalLaps: number;
}): RaceIncident[] {
  const all = [...retirements(params), ...collisions(params)].sort((a, b) => a.showFromMs - b.showFromMs);
  // A first-lap tangle can put two captions on the same second; stagger them so both are read.
  let earliest = 0;
  return all.map((incident) => {
    const from = Math.max(incident.showFromMs, earliest);
    earliest = from + INCIDENT_DISPLAY_MS;
    return { ...incident, showFromMs: from };
  });
}

/**
 * From the lap feed, not positions: a retired car keeps reporting its position from the gravel or
 * the garage, but a parked car starts no more laps.
 */
function retirements({ lapMarkers, drivers, durationMs, lapRange, totalLaps }: Parameters<typeof buildRaceIncidents>[0]): RaceIncident[] {
  // In the window holding the finish every car stops legitimately.
  if (totalLaps > 0 && lapRange.last >= totalLaps) return [];
  const last = new Map<number, LapMarker>();
  for (const m of lapMarkers) {
    const current = last.get(m.driver);
    if (!current || m.ms > current.ms) last.set(m.driver, m);
  }
  if (!last.size) return [];
  const silences = [...last.values()].map((m) => durationMs - m.ms).sort((a, b) => a - b);
  const fieldSilence = silences[Math.floor(silences.length / 2)];

  return [...last].flatMap(([driverNumber, marker]) => {
    const silence = durationMs - marker.ms;
    if (silence < STOPPED_MARGIN_MS || silence < fieldSilence + FIELD_OUTLIER_MS) return [];
    // Timed to when the car leaves the map: once the field starts a lap it never began.
    const later = lapMarkers.filter((m) => m.lap > marker.lap).map((m) => m.ms);
    const leavesAt = later.length ? Math.min(Math.min(...later), durationMs) : marker.ms;
    const name = personalName(drivers.find((d) => d.driver_number === driverNumber)) ?? `Car ${driverNumber}`;
    return [{ showFromMs: leavesAt, text: `${name} is out of the race`, isRetirement: true }];
  });
}

function collisions({ raceControl, drivers, windowStart, durationMs }: Parameters<typeof buildRaceIncidents>[0]): RaceIncident[] {
  return raceControl.flatMap((msg) => {
    const text = msg.message.toUpperCase();
    // Stewards restate a collision as they work through it; only the original note is the moment.
    if (!text.includes('CAUSING A COLLISION') || !text.includes('INCIDENT INVOLVING') || text.startsWith('FIA STEWARDS')) return [];
    const at = parseInstant(msg.date);
    if (at == null) return [];
    const elapsed = at - windowStart;
    if (elapsed < 0 || elapsed > durationMs) return [];
    const names = [...msg.message.matchAll(CAR_WITH_ACRONYM)]
      .map((m) => personalName(drivers.find((d) => d.driver_number === Number(m[1]))))
      .filter((n): n is string => !!n);
    if (!names.length) return [];
    const turn = TURN_NUMBER.exec(text);
    const where = turn ? ` at Turn ${turn[1]}` : '';
    const sentence =
      names.length === 1 ? `${names[0]} was in a collision${where}` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} collided${where}`;
    return [{ showFromMs: elapsed, text: sentence, isRetirement: false }];
  });
}

/** first_name and last_name are properly cased; full_name shouts the surname. */
function personalName(driver?: Driver) {
  if (!driver) return null;
  if (driver.first_name && driver.last_name) return `${driver.first_name} ${driver.last_name}`;
  return driver.last_name ?? driver.full_name ?? null;
}

/**
 * The lap the field gets going on after a restart, judged by each lap's median start across the
 * field: a retired car's phantom marker re-stamped at the restart would otherwise drag it to lap 1.
 */
export function lapInProgressAt(lapMarkers: LapMarker[], resumeMs: number): number | null {
  const byLap = new Map<number, number[]>();
  for (const m of lapMarkers) byLap.set(m.lap, [...(byLap.get(m.lap) ?? []), m.ms]);
  let best: number | null = null;
  for (const [lap, times] of byLap) {
    const sorted = times.sort((a, b) => a - b);
    if (sorted[Math.floor(sorted.length / 2)] <= resumeMs && (best == null || lap > best)) best = lap;
  }
  return best;
}
