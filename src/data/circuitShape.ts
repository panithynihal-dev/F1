import { buildUrl, getJson } from '@/api/http';
import type { CarLocation, Lap, Session } from '@/api/types';
import { lapEnd, lapStart, parseInstant, sessionEnd, toOpenF1Param } from '@/domain/dates';

import { cached, TTL } from './cache';

const OPENF1 = 'https://api.openf1.org/v1/';

export interface CircuitPoint {
  x: number;
  y: number;
  z: number;
}

const SAMPLE_LAP = 10;

/**
 * One clean lap of a circuit in 3D: the fastest lap 10 of the most recent race held there, from
 * real car telemetry, so the shape and the elevation (Eau Rouge, the climb at COTA's turn 1) are
 * the circuit's own. Normalized into a unit box with x/y/z on the same scale.
 *
 * Three requests the first time a circuit is shown, then cached for good: a finished race's lap
 * never changes. Null when the circuit has no finished race on OpenF1 yet (a new venue).
 */
export const getCircuitShape = (circuitKey: number) =>
  cached(
    `circuit_shape_${circuitKey}`,
    async (): Promise<CircuitPoint[] | null> => {
      const sessions = await getJson<Session[]>(buildUrl(OPENF1, 'sessions', { circuit_key: circuitKey, session_name: 'Race' })).catch(() => []);
      const race = sessions
        .filter((s) => (sessionEnd(s) ?? Infinity) < Date.now() && !s.is_cancelled)
        .sort((a, b) => (parseInstant(b.date_start) ?? 0) - (parseInstant(a.date_start) ?? 0))[0];
      if (!race) return null;

      const laps = await getJson<Lap[]>(buildUrl(OPENF1, 'laps', { session_key: race.session_key, lap_number: SAMPLE_LAP }));
      const lap = laps.filter((l) => l.lap_duration).sort((a, b) => a.lap_duration! - b.lap_duration!)[0];
      const from = lap && lapStart(lap);
      const to = lap && lapEnd(lap);
      if (!lap || from == null || to == null) return null;

      const samples = await getJson<CarLocation[]>(
        buildUrl(OPENF1, 'location', {
          session_key: race.session_key,
          driver_number: lap.driver_number,
          'date>': toOpenF1Param(from),
          'date<': toOpenF1Param(to + 1000),
        }),
      );
      const points = samples.filter((p) => p.x !== 0 || p.y !== 0);
      if (points.length < 50) return null;

      const min = (k: 'x' | 'y' | 'z') => Math.min(...points.map((p) => p[k]));
      const max = (k: 'x' | 'y' | 'z') => Math.max(...points.map((p) => p[k]));
      const span = Math.max(max('x') - min('x'), max('y') - min('y'), 1);
      const [cx, cy, minZ] = [(min('x') + max('x')) / 2, (min('y') + max('y')) / 2, min('z')];
      // Centred on the origin, unit-sized, y up for three.js (OpenF1's z is height).
      return points.map((p) => ({ x: (p.x - cx) / span, y: (p.z - minZ) / span, z: -(p.y - cy) / span }));
    },
    { ttl: TTL.permanent, shouldPersist: (shape) => shape != null },
  );
