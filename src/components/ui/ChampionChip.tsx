import { Text, View } from 'react-native';

/** Marks a title that can no longer be lost: gold, like the P1 medal it extends. */
export function ChampionChip() {
  return (
    <View className="rounded-badge bg-gold px-1.5 py-0.5">
      <Text className="font-body-bold text-[12px] text-black">Champion</Text>
    </View>
  );
}
