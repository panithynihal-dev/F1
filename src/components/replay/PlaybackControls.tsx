import { Pressable, Text, View } from 'react-native';

export const SPEEDS = [1, 2, 4, 8, 16] as const;
export type Speed = (typeof SPEEDS)[number];

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Play, pause, scrub and speed — the controls the app's replay never had: it autoplayed in real
 * time with no way to hold a moment. Keyboard: space, ← / → (ten seconds), + / −.
 */
export function PlaybackControls({
  playing,
  onTogglePlay,
  elapsedMs,
  durationMs,
  onSeek,
  speed,
  onSpeed,
  markers = [],
}: {
  playing: boolean;
  onTogglePlay: () => void;
  elapsedMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
  speed: Speed;
  onSpeed: (speed: Speed) => void;
  /** Flag moments on the scrub bar (ms into the window), yellow or red. */
  markers?: { ms: number; color: string; label: string }[];
}) {
  return (
    <View className="flex-row flex-wrap items-center gap-x-5 gap-y-3 border border-line bg-surface px-4 py-3 md:px-6">
      <Pressable
        onPress={onTogglePlay}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause' : 'Play'}
        className="h-11 w-11 items-center justify-center bg-red transition-transform hover:bg-red-dark active:scale-95"
      >
        {playing ? (
          <View className="flex-row gap-1">
            <View className="h-4 w-1.5 bg-white" />
            <View className="h-4 w-1.5 bg-white" />
          </View>
        ) : (
          <View
            style={{ width: 0, height: 0, marginLeft: 3, borderTopWidth: 8, borderBottomWidth: 8, borderLeftWidth: 13, borderStyle: 'solid', borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#FFFFFF' }}
          />
        )}
      </Pressable>

      <View className="min-w-[200px] flex-1 flex-row items-center gap-3">
        <Text className="w-12 text-right font-display text-[16px] text-paper tnum">{clock(elapsedMs)}</Text>
        <View className="relative flex-1 justify-center">
          {markers.map((m, i) => (
            <View
              key={i}
              accessibilityLabel={m.label}
              className="pointer-events-none absolute h-[18px] w-0.5"
              style={{ left: `${(m.ms / Math.max(1, durationMs)) * 100}%`, backgroundColor: m.color, top: -6 }}
            />
          ))}
        <input
          type="range"
          aria-label="Replay position"
          className="tm-scrub"
          min={0}
          max={durationMs}
          step={250}
          value={Math.min(elapsedMs, durationMs)}
          onChange={(event) => onSeek(Number(event.currentTarget.value))}
          style={{ width: '100%', ['--progress' as string]: `${(Math.min(elapsedMs, durationMs) / Math.max(1, durationMs)) * 100}%` }}
        />
        </View>
        <Text className="w-12 font-body text-[14px] text-muted tnum">{clock(durationMs)}</Text>
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel="Playback speed" className="flex-row border border-line">
        {SPEEDS.map((s) => (
          <Pressable
            key={s}
            onPress={() => onSpeed(s)}
            accessibilityRole="radio"
            accessibilityState={{ checked: s === speed }}
            className={`px-3 py-1.5 transition-colors ${s === speed ? 'bg-paper' : 'hover:bg-lifted'}`}
          >
            <Text className={`font-display text-[15px] tnum ${s === speed ? 'text-ground' : 'text-muted'}`}>{s}×</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
