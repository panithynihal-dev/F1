import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { DriverStanding } from '@/api/types';
import { teamBrand } from '@/domain/teamBrand';

/**
 * The championship as a race: each driver's points as a bar in their team colour, measured against
 * the leader, with how far behind they are. The bars have no track behind them; the leader's full
 * bar is the scale.
 */
export function TitleFight({ standings, count = 8 }: { standings: DriverStanding[]; count?: number }) {
  const leaderPoints = Number(standings[0]?.points) || 1;
  return (
    <View className="gap-2.5">
      {standings.slice(0, count).map((s, i) => {
        const points = Number(s.points);
        const team = s.Constructors[s.Constructors.length - 1]?.name;
        return (
          <Link key={s.Driver.driverId} href={`/drivers/${s.Driver.driverId}`} asChild>
            <Pressable className="gap-1 rounded-inner px-1 py-0.5 transition-colors hover:bg-white/[0.03]">
              <View className="flex-row items-baseline gap-2">
                <Text className="w-5 font-display text-[16px] text-muted tnum">{i + 1}</Text>
                <Text numberOfLines={1} className="flex-1 font-body-semi text-[15px] text-white">
                  {s.Driver.givenName} {s.Driver.familyName}
                </Text>
                <Text className="font-body-semi text-[15px] text-white tnum">{s.points}</Text>
                <Text className="w-14 text-right font-body text-[13px] text-muted tnum">{i === 0 ? 'Leader' : `-${leaderPoints - points}`}</Text>
              </View>
              <View className="ml-7 h-1.5 rounded-full" style={{ width: `${Math.max(2, (points / leaderPoints) * 100) * 0.86}%`, backgroundColor: teamBrand(team).color }} />
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}
