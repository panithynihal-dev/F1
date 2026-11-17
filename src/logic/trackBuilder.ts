import type { CarLocation, Driver, Lap, PitStopEvent } from '@/api/types';

import { lapStart, parseInstant } from './dates';

// Port of the app's viewmodel/TrackBuilder.kt: turns a window of raw car-location samples into a
// clean track outline and one smooth path per car. The constants were tuned against real 2026
// races and their reasoning lives in the app's comments; the essentials are restated here.

/** Samples either side of a lap crossing searched for a direction of travel (~5 s at 3–4 Hz). */
const MAX_DIRECTION_SEARCH_RADIUS = 20;
/** A step this many times the window's median peak step is a pit-lane jump, not driving. */
const JUMP_THRESHOLD_MULTIPLIER = 1.5;
/** x/y are decimetres; 1,500 units/s is 540 km/h — anything faster is corrupt data. */
const MAX_PLAUSIBLE_SPEED_UNITS_PER_SEC = 1500;
/** Breaks per lap the replay can absorb, counted after repair (Hungary laps 7–14 sat at 7.2). */
const MAX_DISCONTINUITIES_PER_LAP = 3;
/** Runs shorter than this between impossible steps are splices from elsewhere on the circuit. */
const MIN_COHERENT_SEGMENT_SAMPLES = 5;
/** A hold this many times the window's median hold is a real stop (grid, pit box), not a stale repeat. */
const STATIONARY_HOLD_MULTIPLIER = 4;
/** A real lap ends near where it began: first-to-last distance as a share of its length. */
const MAX_LAP_CLOSURE_RATIO = 0.12;
/** How far a lap's length may sit from the window's median closed lap. */
const MIN_LAP_LENGTH_RATIO = 0.7;
const MAX_LAP_LENGTH_RATIO = 1.3;

/** A location sample with its timestamp parsed once — never inside a sort comparator. */
interface TimedLocation {
  driver: number;
  x: number;
  y: number;
  z: number;
  t: number;
}

export interface NormalizedPoint {
  x: number;
  y: number;
  /** Elevation, on the same scale as x and y (so real gradients keep their proportions). */
  z?: number;
}
/** A normalized point and when it happened, relative to the window start. */
export interface TrackPoint extends NormalizedPoint {
  ms: number;
}
/** When a driver started a lap, relative to the window start. */
export interface LapMarker {
  ms: number;
  lap: number;
  driver: number;
}
export interface StartFinishLine {
  point: NormalizedPoint;
  direction: NormalizedPoint;
}
export interface DriverTrack {
  driverNumber: number;
  acronym: string;
  shortName: string;
  teamColour?: string | null;
  points: TrackPoint[];
}

export type PreparedTelemetry = Map<number, TimedLocation[]>;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y);
const median = (sorted: number[]) => sorted[Math.floor(sorted.length / 2)];
const zipSteps = <T extends { x: number; y: number }>(points: T[]) => {
  const steps: number[] = [];
  for (let i = 1; i < points.length; i++) steps.push(dist(points[i - 1], points[i]));
  return steps;
};

function isPlausibleStep(a: TimedLocation, b: TimedLocation) {
  const seconds = (b.t - a.t) / 1000;
  if (seconds <= 0) return true;
  return dist(a, b) / seconds <= MAX_PLAUSIBLE_SPEED_UNITS_PER_SEC;
}

/**
 * Parses and repairs one window's feed, once. Only rostered drivers get through: the feed also
 * carries the safety and medical cars (numbers like 242) whose movement is erratic.
 */
export function prepareTelemetry(locations: CarLocation[], drivers: Driver[]): PreparedTelemetry {
  const rostered = new Set(drivers.map((d) => d.driver_number));
  return sanitizeByDriver(locations.filter((l) => rostered.has(l.driver_number)));
}

/**
 * The feed degrades three ways that all look like cars flickering around the map:
 *  1. No fix — reported at exactly (0, 0); dropped.
 *  2. Spliced bursts — short runs from another part of the circuit; removed.
 *  3. Stale repeats — the same fix re-sent for seconds before jumping; collapsed to the moment it
 *     arrived so interpolation carries the car smoothly across the gap.
 * Bursts go first, while repeats are intact: a car parked in its box holds one coordinate for
 * hundreds of samples and would look like a burst once collapsed.
 */
function sanitizeByDriver(locations: CarLocation[]): PreparedTelemetry {
  const ordered = new Map<number, TimedLocation[]>();
  for (const loc of locations) {
    if (loc.x === 0 && loc.y === 0) continue;
    const t = parseInstant(loc.date);
    if (t == null) continue;
    const list = ordered.get(loc.driver_number) ?? [];
    list.push({ driver: loc.driver_number, x: loc.x, y: loc.y, z: loc.z, t });
    ordered.set(loc.driver_number, list);
  }
  for (const list of ordered.values()) list.sort((a, b) => a.t - b.t);
  const holdCutoff = stationaryHoldCutoff([...ordered.values()]);
  const result: PreparedTelemetry = new Map();
  for (const [driver, samples] of ordered) {
    const repaired = collapseStaleRepeats(dropSplicedBursts(samples), holdCutoff);
    if (repaired.length) result.set(driver, repaired);
  }
  return result;
}

function dropSplicedBursts(samples: TimedLocation[]) {
  if (samples.length < 2) return samples;
  const segments: TimedLocation[][] = [];
  let current = [samples[0]];
  for (let i = 1; i < samples.length; i++) {
    if (isPlausibleStep(samples[i - 1], samples[i])) current.push(samples[i]);
    else {
      segments.push(current);
      current = [samples[i]];
    }
  }
  segments.push(current);
  const kept = segments.filter((s) => s.length >= MIN_COHERENT_SEGMENT_SAMPLES);
  if (kept.length) return kept.flat();
  // A degraded trace beats an empty one; usability is judged for the window as a whole.
  return segments.reduce((a, b) => (b.length > a.length ? b : a), []);
}

const runEnd = (samples: TimedLocation[], i: number) => {
  let end = i;
  while (end + 1 < samples.length && samples[end + 1].x === samples[i].x && samples[end + 1].y === samples[i].y) end++;
  return end;
};

function collapseStaleRepeats(samples: TimedLocation[], holdCutoff: number) {
  if (samples.length < 2) return samples;
  const out: TimedLocation[] = [];
  for (let i = 0; i < samples.length; ) {
    const end = runEnd(samples, i);
    out.push(samples[i]);
    // A long enough hold means the car really stood still; keep its end so it stays put.
    if (end > i && samples[end].t - samples[i].t > holdCutoff) out.push(samples[end]);
    i = end + 1;
  }
  return out;
}

function stationaryHoldCutoff(byDriver: TimedLocation[][]) {
  const durations: number[] = [];
  for (const samples of byDriver) {
    for (let i = 0; i < samples.length; ) {
      const end = runEnd(samples, i);
      durations.push(samples[end].t - samples[i].t);
      i = end + 1;
    }
  }
  if (!durations.length) return 0;
  return median(durations.sort((a, b) => a - b)) * STATIONARY_HOLD_MULTIPLIER;
}

/** Median across the field of impossible steps per lap — a couple of broken cars can't condemn a window. */
export function isTelemetryUsable(prepared: PreparedTelemetry, lapCount: number) {
  const laps = Math.max(1, lapCount);
  const perDriver = [...prepared.values()]
    .filter((s) => s.length >= 2)
    .map((s) => {
      let breaks = 0;
      for (let i = 1; i < s.length; i++) if (!isPlausibleStep(s[i - 1], s[i])) breaks++;
      return breaks / laps;
    })
    .sort((a, b) => a - b);
  return !perDriver.length || median(perDriver) <= MAX_DISCONTINUITIES_PER_LAP;
}

/**
 * Normalizes every car into 0..1, both axes divided by the same span so the circuit keeps its real
 * proportions. The bounding box ignores everything after a car's first pit-lane-sized jump, so one
 * car sitting in its garage can't shrink everyone else's track into a corner.
 */
export function buildDriverTracks(prepared: PreparedTelemetry, drivers: Driver[], windowStart: number): DriverTrack[] {
  if (!prepared.size) return [];
  const byNumber = new Map(drivers.map((d) => [d.driver_number, d]));
  const threshold = rawJumpThreshold(prepared);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  for (const samples of prepared.values()) {
    for (const p of cleanPrefix(samples, threshold)) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (p.z < minZ) minZ = p.z;
    }
  }
  const span = Math.max(maxX - minX, maxY - minY, 1);
  return [...prepared]
    .map(([driverNumber, samples]) => {
      const driver = byNumber.get(driverNumber);
      return {
        driverNumber,
        acronym: driver?.name_acronym ?? String(driverNumber),
        shortName: driver?.last_name ?? driver?.name_acronym ?? `#${driverNumber}`,
        teamColour: driver?.team_colour,
        points: samples.map((s) => ({ ms: Math.max(0, s.t - windowStart), x: (s.x - minX) / span, y: (s.y - minY) / span, z: (s.z - minZ) / span })),
      };
    })
    .filter((track) => track.points.length > 0);
}

function rawJumpThreshold(prepared: PreparedTelemetry) {
  const peaks = [...prepared.values()].map((s) => Math.max(0, ...zipSteps(s))).filter((p) => p > 0);
  return peaks.length ? median(peaks.sort((a, b) => a - b)) * JUMP_THRESHOLD_MULTIPLIER : 0;
}

function cleanPrefix(points: TimedLocation[], threshold: number) {
  if (points.length < 2 || threshold <= 0) return points;
  const clean = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (dist(points[i - 1], points[i]) > threshold) break;
    clean.push(points[i]);
  }
  return clean;
}

/** Every lap start across the field, relative to the window, in time order. */
export function buildLapMarkers(laps: Lap[], windowStart: number): LapMarker[] {
  return laps
    .flatMap((lap) => {
      const start = lapStart(lap);
      return start == null ? [] : [{ ms: start - windowStart, lap: lap.lap_number, driver: lap.driver_number }];
    })
    .sort((a, b) => a.ms - b.ms);
}

interface LapCandidate {
  points: TrackPoint[];
  length: number;
  maxStep: number;
  closure: number;
}

/**
 * The outline is a single clean lap, not a whole window (several laps retrace the shape with
 * crossing lines). Laps with a recorded pit stop are never eligible; the rest are judged by
 * closure first, then plausible length, then fewest jumps, then most ground covered. Maximizing
 * length alone would pick the worst lap, because splices make a lap retrace ground.
 */
export function buildTrackOutline(tracks: DriverTrack[], markers: LapMarker[], pitStops: PitStopEvent[]): NormalizedPoint[] {
  const markersByDriver = new Map<number, LapMarker[]>();
  for (const m of markers) markersByDriver.set(m.driver, [...(markersByDriver.get(m.driver) ?? []), m]);
  const pitted = new Set(pitStops.filter((p) => p.lap_number != null).map((p) => `${p.driver_number}:${p.lap_number}`));

  const candidates: LapCandidate[] = [];
  for (const track of tracks) {
    const own = markersByDriver.get(track.driverNumber) ?? [];
    for (let i = 0; i < own.length - 1; i++) {
      if (pitted.has(`${track.driverNumber}:${own[i].lap}`)) continue;
      const points = track.points.filter((p) => p.ms >= own[i].ms && p.ms <= own[i + 1].ms);
      const steps = zipSteps(points);
      if (!steps.length) continue;
      candidates.push({
        points,
        length: steps.reduce((a, b) => a + b, 0),
        maxStep: Math.max(...steps),
        closure: dist(points[0], points[points.length - 1]),
      });
    }
  }
  const threshold = candidates.length ? median(candidates.map((c) => c.maxStep).sort((a, b) => a - b)) * JUMP_THRESHOLD_MULTIPLIER : 0;
  const best = pickOutlineLap(candidates, threshold);
  const pathLength = (points: TrackPoint[]) => zipSteps(points).reduce((a, b) => a + b, 0);
  const longest = (list: DriverTrack[]) => list.reduce<DriverTrack | null>((a, b) => (!a || pathLength(b.points) > pathLength(a.points) ? b : a), null);
  const outline =
    best ??
    longest(tracks.filter((t) => !(threshold > 0 && zipSteps(t.points).some((s) => s > threshold))))?.points ??
    longest(tracks)?.points ??
    [];
  return outline.map(({ x, y, z }) => ({ x, y, z }));
}

function pickOutlineLap(candidates: LapCandidate[], threshold: number): TrackPoint[] | null {
  const loops = candidates.filter((c) => c.length > 0 && c.closure / c.length <= MAX_LAP_CLOSURE_RATIO);
  if (!loops.length) {
    const clean = candidates.filter((c) => threshold <= 0 || c.maxStep <= threshold);
    return clean.reduce<LapCandidate | null>((a, b) => (!a || b.length > a.length ? b : a), null)?.points ?? null;
  }
  const trackLength = median(loops.map((c) => c.length).sort((a, b) => a - b));
  const full = loops.filter((c) => c.length >= trackLength * MIN_LAP_LENGTH_RATIO && c.length <= trackLength * MAX_LAP_LENGTH_RATIO);
  const jumps = (c: LapCandidate) => (threshold <= 0 ? 0 : zipSteps(c.points).filter((s) => s > threshold).length);
  return [...(full.length ? full : loops)].sort((a, b) => jumps(a) - jumps(b) || b.length - a.length)[0]?.points ?? null;
}

/** The start/finish line: where a lap boundary falls in this window, and the direction of travel there. */
export function findStartFinishLine(markers: LapMarker[], tracks: DriverTrack[], durationMs: number): StartFinishLine | null {
  const marker = markers.find((m) => m.ms >= 0 && m.ms <= durationMs);
  const track = marker && tracks.find((t) => t.driverNumber === marker.driver);
  if (!marker || !track || track.points.length < 2) return null;
  const points = track.points;
  let index = 0;
  for (let i = 1; i < points.length; i++) if (Math.abs(points[i].ms - marker.ms) < Math.abs(points[index].ms - marker.ms)) index = i;
  // A standing start can still be motionless at the crossing, so widen until there's movement.
  for (let r = 1; r <= MAX_DIRECTION_SEARCH_RADIUS; r++) {
    const before = points[index - r] ?? points[0];
    const after = points[index + r] ?? points[points.length - 1];
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    if (dx || dy) return { point: { x: points[index].x, y: points[index].y }, direction: { x: dx, y: dy } };
  }
  return null;
}

/** Linear interpolation between the two real samples either side of `ms`, clamped at the ends. */
export function positionAt(points: TrackPoint[], ms: number, hint = { index: 1 }): NormalizedPoint | null {
  if (!points.length) return null;
  if (ms <= points[0].ms) return points[0];
  const last = points[points.length - 1];
  if (ms >= last.ms) return last;
  // Playback moves forward a frame at a time, so the search resumes from last frame's index.
  let i = Math.min(Math.max(hint.index, 1), points.length - 1);
  if (points[i - 1].ms > ms) i = 1;
  while (i < points.length - 1 && points[i].ms < ms) i++;
  hint.index = i;
  const a = points[i - 1];
  const b = points[i];
  const t = (ms - a.ms) / Math.max(1, b.ms - a.ms);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t };
}
