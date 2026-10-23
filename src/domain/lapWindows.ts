// Port of the lap-window arithmetic in the app's ReplayViewModel.kt. A full race's telemetry is
// 300k+ samples and OpenF1 refuses it in one request, so the replay loads a few laps at a time.

/**
 * Four laps, not six: the location call is the whole load (624 KB gzipped for six laps of the
 * 2026 Dutch GP) and scales with the laps asked for. Four is still a coherent stretch of racing.
 */
export const LAP_WINDOW_SIZE = 4;

export interface LapRange {
  first: number;
  last: number;
}

/**
 * The window starting at `requested`, sliding back near the end of the race so it still covers a
 * full window rather than trailing off short.
 */
export function resolveLapRange(requested: number, totalLaps: number): LapRange {
  if (totalLaps <= 0) return { first: requested, last: requested };
  const maxStart = Math.max(1, totalLaps - LAP_WINDOW_SIZE + 1);
  const first = Math.min(Math.max(requested, 1), maxStart);
  return { first, last: Math.min(first + LAP_WINDOW_SIZE - 1, totalLaps) };
}

/** An explicit end lap is honoured, but never more than a window's worth. */
export function requestedRange(start: number, end: number | undefined, totalLaps: number): LapRange {
  if (end == null || totalLaps <= 0) return resolveLapRange(start, totalLaps);
  const first = Math.min(Math.max(start, 1), totalLaps);
  return { first, last: Math.min(Math.max(end, first), Math.min(totalLaps, first + LAP_WINDOW_SIZE - 1)) };
}

/**
 * Every window the selector offers, generated with the same resolver the loader uses, so a chip
 * can never advertise laps that tapping it wouldn't load. `fromLap` re-anchors the grid on a red-
 * flag restart: blocks after it line up with the race as actually run, and blocks before it are
 * walked backwards so the short one lands at the start ("Laps 1–2"), where it reads naturally.
 */
export function lapWindows(totalLaps: number, fromLap = 1): LapRange[] {
  if (totalLaps <= 0) return [];
  const anchor = Math.min(Math.max(fromLap, 1), totalLaps);

  const before: LapRange[] = [];
  for (let end = anchor - 1; end >= 1; ) {
    const first = Math.max(1, end - LAP_WINDOW_SIZE + 1);
    before.unshift({ first, last: end });
    end = first - 1;
  }

  const after: LapRange[] = [];
  for (let start = anchor; ; start += LAP_WINDOW_SIZE) {
    const window = resolveLapRange(start, totalLaps);
    const previous = after[after.length - 1];
    if (previous && previous.first === window.first && previous.last === window.last) break;
    if (after.length && window.first < anchor) break;
    after.push(window);
    if (window.last >= totalLaps) break;
  }

  const head = after[0];
  if (!head) return before;
  return [...before.filter((w) => !(w.first >= head.first && w.last <= head.last)), ...after];
}

export const formatLapRange = (range: LapRange) => (range.first === range.last ? `Lap ${range.first}` : `Laps ${range.first}–${range.last}`);
