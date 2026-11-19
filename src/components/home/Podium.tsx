import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { RaceResult } from '@/api/types';
import { ScriptName } from '@/components/ui/DriverName';
import { driverPalette } from '@/logic/helmets';
import { teamBrand } from '@/logic/teamBrand';

const MEDAL: Record<string, string> = { '1': '#F5C518', '2': '#C0C0C8', '3': '#CD7F32' };
const STEP: Record<string, number> = { '1': 150, '2': 108, '3': 78 };

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;

/** The driver who gained the most places from the grid (pit-lane starts count as the back). */
export function biggestClimb(results: RaceResult[]) {
  const gain = (r: RaceResult) => (Number(r.grid) || results.length) - Number(r.position);
  const best = [...results].filter((r) => /^\d+$/.test(r.positionText)).sort((a, b) => gain(b) - gain(a))[0];
  return best && gain(best) > 0 ? { result: best, from: Number(best.grid) || results.length, to: Number(best.position) } : null;
}

/**
 * The last race's top three on a podium: second, winner, third, each name in its driver's own
 * helmet colours, each step capped in the team colour. Under it, the drive of the day by numbers.
 */
export function Podium({ podium, results, compact = false }: { podium: RaceResult[]; results?: RaceResult[]; compact?: boolean }) {
  const order = [podium[1], podium[0], podium[2]].filter(Boolean);
  const climb = results ? biggestClimb(results) : null;
  return (
    <View>
      <View className="flex-row items-end gap-2" style={{ height: compact ? 260 : 300 }}>
        {order.map((r) => (
          <Link key={r.Driver.driverId} href={`/drivers/${r.Driver.driverId}`} asChild>
            <Pressable className="flex-1 justify-end gap-2.5" accessibilityLabel={`${r.position}: ${r.Driver.givenName} ${r.Driver.familyName}`}>
              <View className="items-center">
                {/* Surname in script, shrunk to fit its step ("Verstappen" on a phone). */}
                <View className="w-full">
                  <ScriptName text={r.Driver.familyName} palette={driverPalette(r.Driver.driverId, r.Constructor.name)} maxSize={compact ? 34 : 44} as="span" className="text-center" />
                </View>
                <Text numberOfLines={1} className="mt-1 font-display text-[16px] text-muted tnum">
                  {r.Time?.time ?? r.status}
                </Text>
              </View>
              <View className="items-center bg-surface pt-2" style={{ height: STEP[r.position], borderTopWidth: 4, borderTopColor: teamBrand(r.Constructor.name).color }}>
                <Text className="font-display tnum" style={{ color: MEDAL[r.position], fontSize: compact ? 48 : 60, lineHeight: compact ? 48 : 60 }}>
                  {r.position}
                </Text>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
      {climb ? (
        <View className="mt-4 flex-row items-center gap-3">
          <View className="h-10 w-1" style={{ backgroundColor: teamBrand(climb.result.Constructor.name).color }} />
          <Text className="flex-1 font-body text-[15px] leading-[21px] text-paper">
            <Text className="font-body-bold">Biggest climb: </Text>
            {climb.result.Driver.givenName} {climb.result.Driver.familyName}, {ordinal(climb.from)} on the grid to {ordinal(climb.to)} at the flag.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
