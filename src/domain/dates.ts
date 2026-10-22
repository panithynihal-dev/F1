import type { Lap, Meeting, RaceControlMessage, RaceSchedule, Session } from '@/api/types';

// Port of the app's util/DateUtils.kt. Instants are epoch milliseconds throughout; parsing happens
// once per value, never inside a sort comparator (see TrackBuilder for why that matters).

export const parseInstant = (raw?: string | null): number | null => {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
};

/** Jolpica splits a start into a UTC `date` and `time`; a missing time falls back to midnight UTC. */
export const raceStart = (race: { date: string; time?: string }): number | null =>
  parseInstant(`${race.date}T${race.time ? race.time.replace(/Z$/, '') : '00:00:00'}Z`);

export const sessionStart = (s: Session) => parseInstant(s.date_start);
export const sessionEnd = (s: Session) => parseInstant(s.date_end);
export const meetingStart = (m: Meeting) => parseInstant(m.date_start);
export const meetingEnd = (m: Meeting) => parseInstant(m.date_end);
export const lapStart = (lap: Lap) => parseInstant(lap.date_start);
export const lapEnd = (lap: Lap) => {
  const start = lapStart(lap);
  return start == null || lap.lap_duration == null ? null : start + lap.lap_duration * 1000;
};

/** UTC calendar day ("2026-03-08") of an instant — how the two APIs are joined, having no shared ID. */
export const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** OpenF1 query format: second precision, no zone. */
export const toOpenF1Param = (ms: number) => new Date(ms).toISOString().slice(0, 19);

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dayMonthFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const weekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });

/**
 * The race day in the viewer's timezone when the start time is known — "09:00 your time" beside the
 * UTC date would be a day out for half the world — and the published day otherwise.
 */
export const formatRaceDate = (race: RaceSchedule) => {
  if (race.time) {
    const start = raceStart(race);
    if (start != null) return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(start);
  }
  const ms = parseInstant(`${race.date}T00:00:00Z`);
  return ms == null ? race.date : dateFormat.format(ms);
};
export const formatDayMonth = (date: string) => {
  const ms = parseInstant(`${date}T00:00:00Z`);
  return ms == null ? date : dayMonthFormat.format(ms);
};
export const formatWeekday = (date: string) => {
  const ms = parseInstant(`${date}T00:00:00Z`);
  return ms == null ? '' : weekdayFormat.format(ms);
};

/** "15:00" in the viewer's own timezone — what someone planning their evening actually needs. */
export const formatViewerTime = (ms: number) =>
  new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(ms);

/** "Sat" in the viewer's timezone — a Friday-evening session in Texas is a Saturday morning in Auckland. */
export const formatViewerWeekday = (ms: number) => new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(ms);

export const viewerTimeZoneName = () =>
  new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(Date.now()).find((p) => p.type === 'timeZoneName')
    ?.value ?? '';

/**
 * "15:00" at the circuit. Jolpica publishes the start in UTC; the offset ("02:00:00", or
 * "-04:00:00") comes from OpenF1's meeting, so this needs both APIs and returns null if either half
 * is missing.
 */
export const formatCircuitTime = (race: RaceSchedule, gmtOffset?: string | null) => {
  if (!race.time || !gmtOffset) return null;
  const start = raceStart(race);
  const match = /^(-?)(\d{1,2}):(\d{2})/.exec(gmtOffset);
  if (start == null || !match) return null;
  const sign = match[1] ? -1 : 1;
  const offsetMs = sign * (Number(match[2]) * 60 + Number(match[3])) * 60_000;
  const local = new Date(start + offsetMs);
  return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
};

/** OpenF1 lap durations arrive as seconds (96.96) — shown as "1:36.960". */
export const formatLapTime = (seconds?: number | null) => {
  if (seconds == null) return '–';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return minutes > 0 ? `${minutes}:${rest.toFixed(3).padStart(6, '0')}` : rest.toFixed(3);
};

// ---- Race control: flags, safety car, stoppages ----

export type TrackFlag = 'green' | 'yellow' | 'red';

const CATEGORY_FLAG = 'Flag';
const CATEGORY_SESSION_STATUS = 'SessionStatus';
const CATEGORY_SAFETY_CAR = 'SafetyCar';
const YELLOW_FLAGS = new Set(['YELLOW', 'DOUBLE YELLOW']);

type Timed = { msg: RaceControlMessage; at: number };

const timed = (messages: RaceControlMessage[]): Timed[] =>
  messages.flatMap((msg) => {
    const at = parseInstant(msg.date);
    return at == null ? [] : [{ msg, at }];
  });

/**
 * A stoppage, and the restart after it, both close a safety car period. When a red flag intervenes
 * race control never sends the matching "ENDING" — the 2026 Italian GP's lap-3 deployment has none
 * — so reading only the SafetyCar category would leave it open all afternoon.
 */
const endsSafetyCar = (msg: RaceControlMessage) => {
  const text = msg.message.toUpperCase();
  if (msg.category === CATEGORY_SAFETY_CAR) return text.includes('ENDING') || text.includes('IN THIS LAP');
  if (msg.category === CATEGORY_SESSION_STATUS) return text.includes('ABORTED') || text.includes('STARTED');
  return false;
};

export function isSafetyCarActiveAt(messages: RaceControlMessage[], at: number) {
  const upTo = timed(messages).filter((t) => t.at <= at);
  let deployed = -Infinity;
  let ended = -Infinity;
  for (const { msg, at: when } of upTo) {
    if (msg.category === CATEGORY_SAFETY_CAR && msg.message.toUpperCase().includes('DEPLOYED')) deployed = Math.max(deployed, when);
    if (endsSafetyCar(msg)) ended = Math.max(ended, when);
  }
  return deployed > -Infinity && ended < deployed;
}

export interface SafetyCarPeriod {
  startLap: number | null;
  endLap: number | null;
}

/** Every SC/VSC period in the whole session, independent of whichever laps the replay is showing. */
export function summarizeSafetyCarPeriods(messages: RaceControlMessage[]): SafetyCarPeriod[] {
  const periods: SafetyCarPeriod[] = [];
  let openStart: number | null = null;
  let open = false;
  for (const { msg } of timed(messages).sort((a, b) => a.at - b.at)) {
    const text = msg.message.toUpperCase();
    if (msg.category === CATEGORY_SAFETY_CAR && text.includes('DEPLOYED')) {
      if (open) periods.push({ startLap: openStart, endLap: openStart });
      openStart = msg.lap_number ?? null;
      open = true;
    } else if (endsSafetyCar(msg) && open) {
      periods.push({ startLap: openStart, endLap: msg.lap_number ?? null });
      open = false;
      openStart = null;
    }
  }
  if (open) periods.push({ startLap: openStart, endLap: null });
  return periods;
}

/** "Safety car: laps 1–4, 18–21", or null if it never came out. */
export function formatSafetyCarSummary(periods: SafetyCarPeriod[]) {
  if (!periods.length) return null;
  const parts = periods.map(({ startLap, endLap }) => {
    const start = startLap?.toString() ?? '?';
    if (endLap == null) return `${start}+`;
    return endLap === startLap ? start : `${start}–${endLap}`;
  });
  return `Safety car: laps ${parts.join(', ')}`;
}

/**
 * The flag state at an instant. Red is not a `flag` value: a stoppage arrives as SessionStatus
 * "SESSION ABORTED" and lasts until "SESSION STARTED". Yellows are per sector, each cleared by a
 * CLEAR for that sector; a track-wide green or clear, or a stoppage/restart, wipes the board.
 * Driver-scoped flags (blue, black-and-white) say nothing about the track.
 */
export function trackFlagAt(messages: RaceControlMessage[], at: number): TrackFlag {
  const upTo = timed(messages)
    .filter((t) => t.at <= at)
    .sort((a, b) => a.at - b.at);

  const lastStatus = [...upTo].reverse().find((t) => t.msg.category === CATEGORY_SESSION_STATUS);
  if (lastStatus?.msg.message.toUpperCase().includes('ABORTED')) return 'red';
  if (isSafetyCarActiveAt(messages, at)) return 'yellow';

  const held = new Set<number | null | undefined>();
  for (const { msg } of upTo) {
    const isTrackFlag = msg.category === CATEGORY_FLAG && msg.scope !== 'Driver';
    if (!isTrackFlag && msg.category !== CATEGORY_SESSION_STATUS) continue;
    const flag = msg.flag?.toUpperCase();
    if (msg.category === CATEGORY_SESSION_STATUS) held.clear();
    else if (msg.scope === 'Track' && (flag === 'GREEN' || flag === 'CLEAR')) held.clear();
    else if (flag === 'CLEAR') held.delete(msg.sector);
    else if (flag && YELLOW_FLAGS.has(flag)) held.add(msg.sector);
  }
  return held.size ? 'yellow' : 'green';
}

/**
 * When racing resumes after a stoppage strictly after `at`. SESSION STARTED only reopens the
 * session — a formation lap and a stationary grid follow, nine minutes of it at the 2026 Dutch GP —
 * so the first OVERTAKE ENABLED after it is the real target, falling back to the session resume.
 */
export function nextRacingResumeAt(messages: RaceControlMessage[], at: number): number | null {
  const all = timed(messages);
  const resume = Math.min(
    ...all.filter((t) => t.msg.category === CATEGORY_SESSION_STATUS && t.msg.message.toUpperCase().includes('STARTED') && t.at > at).map((t) => t.at),
  );
  if (!Number.isFinite(resume)) return null;
  const racing = Math.min(...all.filter((t) => t.msg.message.toUpperCase().includes('OVERTAKE ENABLED') && t.at >= resume).map((t) => t.at));
  return Number.isFinite(racing) ? racing : resume;
}

const FORMATION_MARKERS = ['STANDING START', 'FORMATION LAP'];

/**
 * Whether the field is running to the grid rather than racing. At a start lights-out is SESSION
 * STARTED and the formation precedes it; at a restart SESSION STARTED comes first and the
 * formation ends only at OVERTAKE ENABLED — so a formation marker is ended by whichever racing
 * marker lands after it.
 */
export function isFormationLapAt(messages: RaceControlMessage[], at: number) {
  const upTo = timed(messages).filter((t) => t.at <= at);
  const lastFormation = Math.max(
    ...upTo.filter((t) => FORMATION_MARKERS.some((m) => t.msg.message.toUpperCase().includes(m))).map((t) => t.at),
  );
  if (!Number.isFinite(lastFormation)) return false;
  const lastRacing = Math.max(
    ...upTo
      .filter(
        (t) =>
          (t.msg.category === CATEGORY_SESSION_STATUS && t.msg.message.toUpperCase().includes('STARTED')) ||
          t.msg.message.toUpperCase().includes('OVERTAKE ENABLED'),
      )
      .map((t) => t.at),
  );
  return !Number.isFinite(lastRacing) || lastFormation > lastRacing;
}
