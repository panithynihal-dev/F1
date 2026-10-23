import { useQuery } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { Card, Page } from '@/components/layout/Page';
import { Leaderboard } from '@/components/replay/Leaderboard';
import { PlaybackControls, SPEEDS, type Speed } from '@/components/replay/PlaybackControls';
import { TrackCanvas, type View as MapView } from '@/components/replay/TrackCanvas';
import { LoadingCar } from '@/components/ui/LoadingCar';
import { ErrorState, errorMessage } from '@/components/ui/States';
import { getIntervals, getMeetings } from '@/data/repository';
import { loadReplayBundle, loadReplayWindow, ReplayError, type ReplayBundle, type ReplayWindow } from '@/data/replay';
import {
  formatSafetyCarSummary,
  isFormationLapAt,
  isSafetyCarActiveAt,
  nextRacingResumeAt,
  summarizeSafetyCarPeriods,
  trackFlagAt,
  type TrackFlag,
} from '@/domain/dates';
import { prepareLeaderboard, rowsAt } from '@/domain/leaderboard';
import { formatLapRange, lapWindows, type LapRange } from '@/domain/lapWindows';
import { INCIDENT_DISPLAY_MS, lapInProgressAt, type RaceIncident } from '@/domain/raceIncidents';
import { hasWebGL } from '@/hooks/useReducedMotion';

const DEFAULT_SPEED: Speed = 4;

// three.js loads only when someone switches to the 3D view.
const ReplayScene = lazy(() => import('@/components/three/scenes').then((m) => ({ default: m.ReplayScene })));

export default function Replay() {
  const params = useLocalSearchParams<{ sessionKey: string; laps?: string; from?: string; t?: string }>();
  const sessionKey = Number(params.sessionKey);
  // The lap window and the grid's anchor live in the URL, so a moment can be shared.
  const [first, last] = (params.laps ?? '1').split('-').map(Number);
  const anchor = Number(params.from) || 1;

  const bundle = useQuery({ queryKey: ['replayBundle', sessionKey], queryFn: () => loadReplayBundle(sessionKey), staleTime: Infinity });
  const lapWindow = useQuery({
    queryKey: ['replayWindow', sessionKey, first || 1, last || null],
    queryFn: () => loadReplayWindow(bundle.data!, first || 1, last || undefined),
    enabled: bundle.isSuccess,
    staleTime: Infinity,
    // Keep the last few windows in memory: going back to one is then instant.
    gcTime: 10 * 60_000,
    retry: false,
  });
  const meetings = useQuery({
    queryKey: ['meetings', bundle.data?.session.year],
    queryFn: () => getMeetings(bundle.data!.session.year),
    enabled: bundle.isSuccess,
  });
  const meeting = meetings.data?.find((m) => m.meeting_key === bundle.data?.session.meeting_key);
  const title = bundle.data ? `${meeting?.meeting_name ?? bundle.data.session.country_name ?? ''} ${bundle.data.session.session_name}`.trim() : 'Replay';

  const selectWindow = useCallback(
    (range: LapRange, from = anchor) => router.setParams({ laps: `${range.first}-${range.last}`, from: String(from) }),
    [anchor],
  );

  if (bundle.isPending) return <ReplayLoading caption="Loading the session…" />;
  if (bundle.isError) {
    return (
      <Page>
        <ErrorState title="This replay didn't load" detail={errorMessage(bundle.error)} onRetry={() => bundle.refetch()} />
      </Page>
    );
  }

  return (
    <Page wide>
      <Head>
        <title>{`${title} replay · TrackiMetrix`}</title>
      </Head>
      <View className="mb-4 flex-row flex-wrap items-end justify-between gap-3">
        <View className="gap-1">
          <Link href={`/results/${sessionKey}`} asChild>
            <Pressable>
              <Text className="font-display-semi text-[17px] text-red hover:underline">{title}</Text>
            </Pressable>
          </Link>
          <Text accessibilityRole="header" className="font-display text-[40px] leading-[42px] text-white md:text-[52px] md:leading-[54px]">
            Replay
          </Text>
        </View>
        <SafetyCarSummary bundle={bundle.data} />
      </View>

      <LapWindowChips bundle={bundle.data} current={lapWindow.data?.lapRange} requested={{ first: first || 1, last: last || 0 }} anchor={anchor} onSelect={selectWindow} />

      {lapWindow.isPending ? (
        <ReplayLoading caption="Fetching car positions for these laps…" inline />
      ) : lapWindow.isError ? (
        <ErrorState
          title="These laps can't be replayed"
          detail={errorMessage(lapWindow.error)}
          // A broken feed stays broken; only a network failure is worth retrying.
          onRetry={lapWindow.error instanceof ReplayError ? undefined : () => lapWindow.refetch()}
        />
      ) : (
        <ReplayStage
          key={`${lapWindow.data.lapRange.first}-${lapWindow.data.lapRange.last}`}
          bundle={bundle.data}
          data={lapWindow.data}
          anchor={anchor}
          startAtMs={(Number(params.t) || 0) * 1000}
          onSelectWindow={selectWindow}
        />
      )}
    </Page>
  );
}

function ReplayLoading({ caption, inline = false }: { caption: string; inline?: boolean }) {
  return (
    <View className={`items-center justify-center gap-4 ${inline ? 'min-h-[420px] rounded-card border border-line bg-surface' : 'flex-1 py-24'}`}>
      <LoadingCar width={280} />
      <Text className="font-body text-[15px] text-muted">{caption}</Text>
    </View>
  );
}

function SafetyCarSummary({ bundle }: { bundle: ReplayBundle }) {
  // The whole session's SC/VSC periods, which a four-lap window will usually miss.
  const summary = useMemo(() => formatSafetyCarSummary(summarizeSafetyCarPeriods(bundle.raceControl)), [bundle]);
  return (
    <Text className="font-body text-[15px] text-muted">
      {bundle.totalLaps} laps{summary ? `. ${summary}` : '. No safety car'}
    </Text>
  );
}

function LapWindowChips({
  bundle,
  current,
  requested,
  anchor,
  onSelect,
}: {
  bundle: ReplayBundle;
  current?: LapRange;
  requested: LapRange;
  anchor: number;
  onSelect: (range: LapRange) => void;
}) {
  const windows = useMemo(() => lapWindows(bundle.totalLaps, anchor), [bundle.totalLaps, anchor]);
  const shown = current ?? requested;
  const overlap = (w: LapRange) => Math.min(w.last, shown.last || w.last) - Math.max(w.first, shown.first);
  const selected = windows.reduce((best, w, i) => (best < 0 || overlap(w) > overlap(windows[best]) ? i : best), -1);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerClassName="gap-1.5">
      {windows.map((w, i) => {
        const active = i === selected;
        return (
          <Pressable
            key={`${w.first}-${w.last}`}
            onPress={() => onSelect(w)}
            accessibilityState={{ selected: active }}
            className={`rounded-full border px-3.5 py-1.5 transition-colors ${active ? 'border-red bg-red' : 'border-line hover:border-muted'}`}
          >
            <Text className={`font-body-semi text-[14px] tnum ${active ? 'text-white' : 'text-muted'}`}>{formatLapRange(w)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Everything that plays: one window's map, clock, controls and running order. */
function ReplayStage({
  bundle,
  data,
  anchor,
  startAtMs,
  onSelectWindow,
}: {
  bundle: ReplayBundle;
  data: ReplayWindow;
  anchor: number;
  /** From `?t=` in seconds, so a link can open on a particular moment. */
  startAtMs: number;
  onSelectWindow: (range: LapRange, from?: number) => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 1000;

  const initialMs = Math.min(Math.max(0, startAtMs), data.durationMs);
  const clock = useRef(initialMs);
  const view = useRef<MapView>({ zoom: 1, panX: 0, panY: 0 });
  const highlightRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>(DEFAULT_SPEED);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const webgl = useMemo(() => hasWebGL(), []);
  const [mode, setModeState] = useState<ViewMode>(readViewMode);
  const setMode = (next: ViewMode) => {
    setModeState(next);
    try {
      localStorage.setItem(VIEW_MODE_KEY, next);
    } catch {
      // A private window just won't remember the choice.
    }
  };
  // The map draws every frame straight from the clock ref; everything else on the page reads this
  // copy of it, refreshed four times a second, so the page isn't re-rendering at sixty frames.
  const [elapsed, setElapsed] = useState(initialMs);

  useEffect(() => {
    highlightRef.current = highlighted;
  }, [highlighted]);

  // The playback clock. Stops at the end of the window rather than looping, and offers the next one.
  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let lastTick = 0;
    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const dt = Math.min(now - previous, 100);
      previous = now;
      if (playing) {
        clock.current = Math.min(data.durationMs, clock.current + dt * speed);
        if (clock.current >= data.durationMs) setPlaying(false);
      }
      if (now - lastTick > 250) {
        lastTick = now;
        setElapsed(clock.current);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, data.durationMs]);

  const seek = useCallback(
    (ms: number) => {
      clock.current = Math.max(0, Math.min(data.durationMs, ms));
      setElapsed(clock.current);
    },
    [data.durationMs],
  );
  const togglePlay = useCallback(() => {
    if (!playing && clock.current >= data.durationMs) clock.current = 0;
    setPlaying((p) => !p);
  }, [playing, data.durationMs]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) && event.key !== ' ') return;
      if (event.key === ' ') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'ArrowRight') seek(clock.current + 10_000);
      else if (event.key === 'ArrowLeft') seek(clock.current - 10_000);
      else if (event.key === '+' || event.key === '=') setSpeed((s) => SPEEDS[Math.min(SPEEDS.indexOf(s) + 1, SPEEDS.length - 1)]);
      else if (event.key === '-') setSpeed((s) => SPEEDS[Math.max(SPEEDS.indexOf(s) - 1, 0)]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, seek]);

  // Gap data is the heaviest call of all (30k rows a race) and only feeds one column; it's
  // fetched once the window is on screen rather than holding up the map.
  const intervals = useQuery({ queryKey: ['intervals', bundle.session.session_key], queryFn: () => getIntervals(bundle.session.session_key), staleTime: Infinity });
  const leaderboardSource = useMemo(
    () => ({ ...bundle.leaderboard, intervals: intervals.data ? prepareLeaderboard([], [], intervals.data, [], []).intervals : [] }),
    [bundle.leaderboard, intervals.data],
  );

  const at = data.windowStart + elapsed;

  // The lap on screen: the most recent lap start across the field, held to the chosen range.
  const currentLap = useMemo(() => {
    const marker = [...data.lapMarkers].reverse().find((m) => m.ms <= elapsed)?.lap ?? data.lapMarkers[0]?.lap ?? data.lapRange.first;
    return Math.min(Math.max(marker, data.lapRange.first), data.lapRange.last);
  }, [data, elapsed]);

  // A retired car keeps reporting its position; it leaves the map once the field passes its last lap.
  const lastLapByDriver = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of data.lapMarkers) map.set(m.driver, Math.max(map.get(m.driver) ?? 0, m.lap));
    return map;
  }, [data]);
  const retired = useCallback((driver: number) => (lastLapByDriver.get(driver) ?? Infinity) < currentLap, [lastLapByDriver, currentLap]);
  const visibleRef = useRef((driver: number) => !retired(driver));
  useEffect(() => {
    visibleRef.current = (driver: number) => !retired(driver);
  }, [retired]);

  const flag = trackFlagAt(bundle.raceControl, at);
  const safetyCar = isSafetyCarActiveAt(bundle.raceControl, at);
  const formation = isFormationLapAt(bundle.raceControl, at);
  const restartLap = useMemo(() => {
    if (flag !== 'red') return null;
    const resume = nextRacingResumeAt(bundle.raceControl, at);
    const lap = resume == null ? null : lapInProgressAt(data.lapMarkers, resume - data.windowStart);
    return lap != null && lap > data.lapRange.first ? lap : null;
  }, [flag, bundle.raceControl, at, data]);
  const incident = data.incidents.filter((i) => elapsed - i.showFromMs >= 0 && elapsed - i.showFromMs < INCIDENT_DISPLAY_MS).at(-1);
  const rows = rowsAt(leaderboardSource, at, currentLap);

  const windows = lapWindows(bundle.totalLaps, anchor);
  const nextWindow = windows.find((w) => w.first > data.lapRange.first);
  const ended = !playing && elapsed >= data.durationMs;

  return (
    <View className={`gap-4 ${wide ? 'flex-row items-start' : ''}`}>
      <View className="min-w-0 flex-1 gap-3">
        <View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
          <FlagLight flag={flag} />
          <Text className="font-display text-[26px] text-white tnum">
            Lap {currentLap}
            <Text className="text-muted">/{bundle.totalLaps}</Text>
          </Text>
          {formation ? <Badge tone="muted">Formation lap</Badge> : null}
          {safetyCar ? <Badge tone="yellow">Safety car</Badge> : null}
          <View className="ml-auto">
            {webgl ? <ViewModeSwitch mode={mode} onChange={setMode} /> : null}
          </View>
          {restartLap ? (
            <Pressable
              onPress={() => {
                const target = lapWindows(bundle.totalLaps, restartLap).find((w) => w.first === restartLap);
                if (target) onSelectWindow(target, restartLap);
              }}
              className="rounded-full bg-white px-3.5 py-1.5 active:scale-95"
            >
              <Text className="font-body-bold text-[14px] text-ground">Skip to the restart, lap {restartLap}</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="relative overflow-hidden rounded-card border border-line bg-[#0E0E11]" style={{ height: wide ? 'min(68vh, 720px)' : '58vh' } as object}>
          {mode === '3d' && webgl ? (
            <Suspense fallback={<ReplayLoading caption="Building the 3D view…" inline />}>
              <ReplayScene outline={data.outline} tracks={data.tracks} clock={clock} visible={visibleRef} highlighted={highlightRef} />
            </Suspense>
          ) : (
            <TrackCanvas
              outline={data.outline}
              tracks={data.tracks}
              startFinish={data.startFinish}
              clock={clock}
              visible={visibleRef}
              highlighted={highlightRef}
              viewRef={view}
            />
          )}
          {incident ? <IncidentCaption incident={incident} /> : null}
          {ended && nextWindow ? (
            <View className="absolute inset-x-0 bottom-4 items-center">
              <Pressable onPress={() => onSelectWindow(nextWindow)} className="rounded-full bg-red px-5 py-2.5 hover:bg-red-dark active:scale-95">
                <Text className="font-body-bold text-[15px] text-white">Continue with {formatLapRange(nextWindow).toLowerCase()}</Text>
              </Pressable>
            </View>
          ) : null}
          <Text className="pointer-events-none absolute right-3 top-2.5 font-body text-[12px] text-muted">
            {mode === '3d' ? 'Drag to orbit, scroll to zoom, right-drag to pan' : 'Scroll to zoom, drag to move, double-click to reset'}
          </Text>
        </View>

        <PlaybackControls
          playing={playing}
          onTogglePlay={togglePlay}
          elapsedMs={elapsed}
          durationMs={data.durationMs}
          onSeek={seek}
          speed={speed}
          onSpeed={setSpeed}
        />
        <Text className="font-body text-[13px] text-muted">Space to play or pause, ← and → to skip ten seconds, + and − to change speed.</Text>
      </View>

      <Card className={`${wide ? 'w-[360px]' : 'w-full'} p-2`}>
        <View className="flex-row items-center justify-between px-3 pb-2 pt-1">
          <Text className="font-display text-[20px] text-white">Running order</Text>
          <Text className="font-body text-[13px] text-muted">Gap to leader</Text>
        </View>
        <Leaderboard rows={rows} retired={retired} gapsLoaded={intervals.isSuccess} highlighted={highlighted} onHighlight={setHighlighted} />
      </Card>
    </View>
  );
}

type ViewMode = '2d' | '3d';
const VIEW_MODE_KEY = 'trackimetrix.replayView';
const readViewMode = (): ViewMode => {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === '3d' ? '3d' : '2d';
  } catch {
    return '2d';
  }
};

/** Flat map or 3D: the same replay, the same clock, two ways to look at it. */
function ViewModeSwitch({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Replay view" className="flex-row rounded-full border border-line p-0.5">
      {(['2d', '3d'] as const).map((m) => (
        <Pressable
          key={m}
          onPress={() => onChange(m)}
          accessibilityRole="radio"
          accessibilityState={{ checked: mode === m }}
          className={`rounded-full px-3.5 py-1.5 transition-colors ${mode === m ? 'bg-white' : 'hover:bg-white/5'}`}
        >
          <Text className={`font-body-bold text-[13px] ${mode === m ? 'text-ground' : 'text-muted'}`}>{m === '2d' ? 'Map' : '3D'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function FlagLight({ flag }: { flag: TrackFlag }) {
  const colour = { green: '#00C853', yellow: '#FFC400', red: '#E10600' }[flag];
  const label = { green: 'Green flag', yellow: 'Yellow flag', red: 'Red flag' }[flag];
  return (
    <View className="flex-row items-center gap-2" accessibilityLabel={label}>
      <View className={`h-3 w-3 rounded-full ${flag === 'green' ? '' : 'tm-flash'}`} style={{ backgroundColor: colour, boxShadow: `0 0 10px ${colour}` } as object} />
      <Text className="font-body-semi text-[14px] text-muted">{label}</Text>
    </View>
  );
}

function Badge({ children, tone }: { children: string; tone: 'yellow' | 'muted' }) {
  return (
    <View className={`rounded-badge px-2 py-0.5 ${tone === 'yellow' ? 'tm-flash bg-flag-yellow' : 'bg-lifted'}`}>
      <Text className={`font-body-bold text-[13px] ${tone === 'yellow' ? 'text-black' : 'text-white'}`}>{children}</Text>
    </View>
  );
}

/**
 * A line of commentary over the map, held for a few seconds. Its bar carries the severity: red for
 * a car out of the race, amber for contact race control has noted.
 */
function IncidentCaption({ incident }: { incident: RaceIncident }) {
  return (
    <View className="absolute bottom-4 left-4 max-w-[80%] flex-row items-center gap-3 rounded-inner border border-line bg-surface/95 px-4 py-2.5" accessibilityLiveRegion="polite">
      <View className={`h-5 w-[3px] rounded-full ${incident.isRetirement ? 'bg-red' : 'bg-amber'}`} />
      <Text className="font-body-bold text-[15px] text-white">{incident.text}</Text>
    </View>
  );
}

