import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { RaceResult } from '@/api/types';
import { DriverNumberTile } from '@/components/ui/DriverNumberTile';

const MEDAL: Record<string, string> = { '1': '#FFD700', '2': '#C0C0C8', '3': '#CD7F32' };
// Step heights in the podium's own order: second, first, third.
const STEP = { '1': 92, '2': 64, '3': 44 } as Record<string, number>;

/** The last race's top three standing on an actual podium: second, winner, third. */
export function Podium({ podium }: { podium: RaceResult[] }) {
  const order = [podium[1], podium[0], podium[2]].filter(Boolean);
  return (
    <View className="flex-row items-end gap-2 md:gap-3">
      {order.map((r) => (
        <Link key={r.Driver.driverId} href={`/drivers/${r.Driver.driverId}`} asChild>
          <Pressable className="flex-1 items-center gap-2 transition-transform hover:-translate-y-0.5 active:scale-[0.98]">
            <DriverNumberTile teamName={r.Constructor.name} number={r.Driver.permanentNumber} width={r.position === '1' ? 76 : 64} height={r.position === '1' ? 88 : 74} />
            <View className="items-center">
              <Text numberOfLines={1} className="font-display text-[19px] text-white">
                {r.Driver.familyName}
              </Text>
              <Text numberOfLines={1} className="font-body text-[13px] text-muted tnum">
                {r.position === '1' ? r.Time?.time ?? r.Constructor.name : r.Time?.time ?? r.status}
              </Text>
            </View>
            <View
              className="w-full items-center justify-start rounded-t-inner pt-2"
              style={{ height: STEP[r.position], backgroundColor: '#1D1C22', borderTopWidth: 3, borderTopColor: MEDAL[r.position] }}
            >
              <Text className="font-display text-[28px] tnum" style={{ color: MEDAL[r.position] }}>
                {r.position}
              </Text>
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
