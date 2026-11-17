import { Text, View } from 'react-native';

import type { DriverStanding } from '@/api/types';
import { teamBrand } from '@/logic/teamBrand';

/**
 * Who can still finish second once the title is gone (or who can still catch the leader before it
 * is): each contender's points now as a solid bar, and dashed, the most they could still end on.
 * The white line is the target to beat: the current second place's total.
 */
export function BattleForSecond({ standings, pointsLeft, decided }: { standings: DriverStanding[]; pointsLeft: number; decided: boolean }) {
  // While the title is open, the battle is for first: include the leader and measure against them.
  const field = decided ? standings.slice(1, 6) : standings.slice(0, 5);
  if (field.length < 2 || pointsLeft <= 0) return null;
  const target = Number(field[0].points);
  const top = target + pointsLeft;
  const low = Math.max(0, Number(field[field.length - 1].points) - 10);
  const at = (v: number) => ((v - low) / (top - low)) * 100;
  const rivals = field.filter((s) => Number(s.points) + pointsLeft >= target).length - 1;
  return (
    <View className="border border-line bg-surface p-[18px] md:p-6">
      <Text accessibilityRole="header" className="font-title text-[30px] uppercase text-paper">
        {decided ? 'Battle for second' : 'Title race'}
      </Text>
      <Text className="mt-1.5 font-body text-[14px] leading-[20px] text-muted">
        Solid bar: points now. Dashed: the most each can still score ({pointsLeft} points left). The white line is {field[0].Driver.familyName}’s total today.
        {rivals > 0 ? ` ${rivals} ${rivals === 1 ? 'driver' : 'drivers'} can still pass it.` : ''}
      </Text>
      <View className="mt-2.5">
        {field.map((s) => {
          const points = Number(s.points);
          const color = teamBrand(s.Constructors[s.Constructors.length - 1]?.name).color;
          return (
            <View key={s.Driver.driverId} className="py-2.5" accessibilityLabel={`${s.Driver.familyName}: ${points} points, can reach ${points + pointsLeft}`}>
              <View className="flex-row items-baseline justify-between">
                <Text className="font-body-semi text-[15px] text-paper">{s.Driver.familyName}</Text>
                <Text className="font-display text-[17px] text-paper tnum">
                  {points}
                  <Text className="font-body text-[14px] text-muted">{`  can reach ${points + pointsLeft}`}</Text>
                </Text>
              </View>
              <View className="relative mt-1.5 h-3 bg-ground">
                <View className="absolute bottom-0 left-0 top-0" style={{ width: `${at(points)}%`, backgroundColor: color }} />
                <View
                  className="absolute bottom-[3px] top-[3px]"
                  style={{ left: `${at(points)}%`, width: `${at(points + pointsLeft) - at(points)}%`, borderWidth: 1, borderLeftWidth: 0, borderStyle: 'dashed', borderColor: color }}
                />
                <View className="absolute -bottom-1 -top-1 w-0.5 bg-paper" style={{ left: `${at(target)}%` }} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
