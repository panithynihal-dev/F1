import { Text, View } from 'react-native';

const MEDALS: Record<string, string> = { '1': '#FFD700', '2': '#C0C0C8', '3': '#CD7F32' };

/**
 * One race's finish as a small square — podiums in their medal colour, points finishes lifted, the
 * rest quiet, retirements struck through — so a season reads at a glance as a row of them.
 */
export function FinishCell({ position, classified, points }: { position: string; classified: boolean; points: number }) {
  const medal = classified ? MEDALS[position] : undefined;
  return (
    <View
      className={`h-9 w-9 items-center justify-center rounded-badge ${medal ? '' : points > 0 ? 'bg-lifted' : 'border border-line/70'}`}
      style={medal ? { backgroundColor: medal } : undefined}
    >
      <Text className={`font-display text-[16px] tnum ${medal ? 'text-black' : classified ? 'text-white' : 'text-muted line-through'}`}>
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
