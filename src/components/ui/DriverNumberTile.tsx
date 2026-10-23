import { Text, View } from 'react-native';

import { teamBrand } from '@/domain/teamBrand';

/**
 * A driver's race number set into a break in a stripe running down their team's livery — a piece
 * of the car rather than a data field. No "#", because a car doesn't have one. Every dimension is a
 * fraction of the tile so it holds its proportions at any size; a driver without a number gets an
 * unbroken stripe.
 */
export function DriverNumberTile({
  teamName,
  number,
  width,
  height,
}: {
  teamName?: string | null;
  number?: string | null;
  width: number;
  height: number;
}) {
  const { livery } = teamBrand(teamName);
  const stripe = Math.max(3, width * 0.045);
  return (
    <View
      // The hairline keeps a black livery (Mercedes, Williams) from dissolving into the page.
      className="items-center overflow-hidden rounded-inner border border-white/10"
      style={{ width, height, backgroundColor: livery.background, paddingVertical: height * 0.08 }}
    >
      <View className="flex-1" style={{ width: stripe, backgroundColor: livery.ink }} />
      {number ? (
        <Text
          className="font-display tnum"
          style={{ color: livery.ink, fontSize: height * 0.42, lineHeight: height * 0.46, marginVertical: height * 0.02 }}
        >
          {number}
        </Text>
      ) : null}
      <View className="flex-1" style={{ width: stripe, backgroundColor: livery.ink }} />
    </View>
  );
}
