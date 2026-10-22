import { Text, View } from 'react-native';

// Real medal colours, not brand colours, so a podium finish reads as its own thing rather than as
// "more red".
const MEDALS: Record<string, string> = { '1': '#FFD700', '2': '#C0C0C8', '3': '#CD7F32' };

/** A position in a circle. Anything that isn't P1–P3 ("14", "DNF") gets a neutral outline. */
export function RankBadge({ position, size = 28 }: { position?: string | null; size?: number }) {
  const medal = position ? MEDALS[position] : undefined;
  return (
    <View
      className={`items-center justify-center rounded-full ${medal ? '' : 'border border-line'}`}
      style={{ width: size, height: size, backgroundColor: medal }}
    >
      <Text className={`font-display text-[15px] tnum ${medal ? 'text-black' : 'text-white'}`}>{position ?? '–'}</Text>
    </View>
  );
}
