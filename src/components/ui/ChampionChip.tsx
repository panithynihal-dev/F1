import { Text, View } from 'react-native';

/** Marks a title that can no longer be lost. Gold is reserved for this. */
export function ChampionChip({ label = 'Champion' }: { label?: string }) {
  return (
    <View className="h-[22px] justify-center bg-gold px-2">
      <Text className="font-display text-[14px] uppercase tracking-[0.04em] text-ground">{label}</Text>
    </View>
  );
}
