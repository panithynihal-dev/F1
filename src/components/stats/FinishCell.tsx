import { Text, View } from 'react-native';

const MEDALS: Record<string, string> = { '1': '#F5C518', '2': '#C0C0C8', '3': '#CD7F32' };

/**
 * One race's finish as a small square — podiums in their medal colour, points finishes lifted, the
 * rest quiet, retirements struck through — so a season reads at a glance as a row of them.
 */
export function FinishCell({ position, classified, points, size = 36 }: { position: string; classified: boolean; points: number; size?: number }) {
  const medal = classified ? MEDALS[position] : undefined;
  return (
    <View
      className={`items-center justify-center ${medal ? '' : points > 0 || classified ? 'bg-lifted' : 'border border-strong'}`}
      style={{ width: size, height: size, ...(medal ? { backgroundColor: medal } : null) }}
    >
      <Text className={`font-display tnum ${medal ? 'text-ground' : classified ? 'text-paper' : 'text-muted'}`} style={{ fontSize: Math.round(size * 0.44) }}>
        {classified ? position : 'R'}
      </Text>
    </View>
  );
}

/**
 * Jolpica's positionText is the finishing place for a classified car and a letter otherwise
 * (R retired, D disqualified, W withdrawn, N not classified).
 */
export const isClassified = (positionText: string) => /^\d+$/.test(positionText);
