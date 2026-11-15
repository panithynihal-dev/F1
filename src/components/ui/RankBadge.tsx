import { Text } from 'react-native';

// Real medal colours, not brand colours, so a podium finish reads as its own thing.
const MEDALS: Record<string, string> = { '1': '#F5C518', '2': '#C0C0C8', '3': '#CD7F32' };

/** A bare position numeral, the way a timing tower shows it: medal colours for P1–P3, grey otherwise. */
export function RankBadge({ position, size = 30 }: { position?: string | null; size?: number }) {
  const medal = position ? MEDALS[position] : undefined;
  return (
    <Text className="font-display tnum" style={{ width: size, fontSize: Math.round(size * 0.8), color: medal ?? '#8E949D' }}>
      {position ?? '–'}
    </Text>
  );
}
