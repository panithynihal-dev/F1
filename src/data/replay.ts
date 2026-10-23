import type { Driver, Lap, PitStopEvent, RaceControlMessage, Session } from '@/api/types';
import { lapEnd, lapStart, sessionEnd, sessionStart, toOpenF1Param } from '@/domain/dates';
import { buildRaceIncidents, type RaceIncident } from '@/domain/raceIncidents';
import { prepareLeaderboard, type LeaderboardSource } from '@/domain/leaderboard';
import { requestedRange, type LapRange } from '@/domain/lapWindows';
import {
  buildDriverTracks,
  buildLapMarkers,
  buildTrackOutline,
  findStartFinishLine,
  isTelemetryUsable,
  prepareTelemetry,
  type DriverTrack,
  type LapMarker,
  type NormalizedPoint,
  type StartFinishLine,
} from '@/domain/trackBuilder';

import {
  getCarLocations,
  getDrivers,
  getLaps,
  getPitStops,
  getPositions,
  getRaceControl,
  getSession,
  getStints,
  isSessionFinished,
} from './repository';

// Port of the app's ReplayViewModel. Everything about a session that doesn't depend on which laps
// are on screen is loaded once (the bundle); moving between lap windows re-fetches car locations
// only. A finished session's bundle is cached on disk for good; one still running never is.

export class ReplayError extends Error {}

export interface ReplayBundle {
  session: Session;
  laps: Lap[];
  drivers: Driver[];
  totalLaps: number;
  raceControl: RaceControlMessage[];
  pitStops: PitStopEvent[];
  leaderboard: Omit<LeaderboardSource, 'intervals'>;
}

export async function loadReplayBundle(sessionKey: number): Promise<ReplayBundle> {
  const session = await getSession(sessionKey);
  if (!session) throw new ReplayError('This session could not be found.');
  const finished = isSessionFinished(session);
  // Running order, flags, pits and tyres are supporting cast: best effort, small, and parallel.
  const [laps, drivers, positions, raceControl, pitStops, stints] = await Promise.all([
    getLaps(sessionKey, finished),
    getDrivers(sessionKey, finished),
    getPositions(sessionKey, finished).catch(() => []),
    getRaceControl(sessionKey, finished).catch(() => []),
    getPitStops(sessionKey, finished).catch(() => []),
    getStints(sessionKey, finished).catch(() => []),
  ]);
  const { intervals: _none, ...leaderboard } = prepareLeaderboard(drivers, positions, [], pitStops, stints);
  return {
    session,
    laps,
    drivers,
    totalLaps: Math.max(0, ...laps.map((l) => l.lap_number)),
    raceControl,
    pitStops,
    leaderboard,
  };
}

export interface ReplayWindow {
  lapRange: LapRange;
  windowStart: number;
  durationMs: number;
  outline: NormalizedPoint[];
  tracks: DriverTrack[];
  lapMarkers: LapMarker[];
  startFinish: StartFinishLine | null;
  incidents: RaceIncident[];
}

/**
 * Real lap timestamps anchor the window rather than the session's own start and end, which
 * include grid formalities and parc fermé with no telemetry worth drawing.
 */
function resolveWindow(bundle: ReplayBundle, range: LapRange) {
  const starts = bundle.laps.filter((l) => l.lap_number === range.first).map(lapStart).filter((v): v is number => v != null);
  const ends = bundle.laps.filter((l) => l.lap_number === range.last).map(lapEnd).filter((v): v is number => v != null);
  const from = starts.length ? Math.min(...starts) : sessionStart(bundle.session) ?? Date.now();
  const to = ends.length ? Math.max(...ends) : sessionEnd(bundle.session) ?? Date.now();
  return { from, to };
}

const TELEMETRY_MISSING = 'There is no car-position data for these laps. Try another set of laps.';

export async function loadReplayWindow(bundle: ReplayBundle, startLap: number, endLap?: number): Promise<ReplayWindow> {
  const lapRange = requestedRange(startLap, endLap, bundle.totalLaps);
  const { from, to } = resolveWindow(bundle, lapRange);
  // Second precision on the query: round outward so the edges aren't clipped.
  const locations = await getCarLocations(bundle.session.session_key, toOpenF1Param(from - 1000), toOpenF1Param(to + 1000));
  if (!locations.length) throw new ReplayError(TELEMETRY_MISSING);

  const prepared = prepareTelemetry(locations, bundle.drivers);
  if (!prepared.size) throw new ReplayError(TELEMETRY_MISSING);
  // Some stretches of feed are too shredded to trace even after repair (2026 Hungarian GP laps
  // 7–14); saying so beats drawing a starburst.
  if (!isTelemetryUsable(prepared, lapRange.last - lapRange.first + 1)) {
    throw new ReplayError('The car-position feed for these laps is too broken to draw. Try another set of laps.');
  }

  const tracks = buildDriverTracks(prepared, bundle.drivers, from);
  const lapMarkers = buildLapMarkers(bundle.laps, from);
  const durationMs = Math.max(1000, ...tracks.flatMap((t) => (t.points.length ? [t.points[t.points.length - 1].ms] : [])));
  return {
    lapRange,
    windowStart: from,
    durationMs,
    outline: buildTrackOutline(tracks, lapMarkers, bundle.pitStops),
    tracks,
    lapMarkers,
    startFinish: findStartFinishLine(lapMarkers, tracks, durationMs),
    incidents: buildRaceIncidents({
      lapMarkers,
      drivers: bundle.drivers,
      raceControl: bundle.raceControl,
      windowStart: from,
      durationMs,
      lapRange,
      totalLaps: bundle.totalLaps,
    }),
  };
}
