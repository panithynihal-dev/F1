import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { DriverStanding } from '@/api/types';
import { ChampionChip } from '@/components/ui/ChampionChip';
import { teamBrand } from '@/logic/teamBrand';

/**
 * The drivers' standings as a timing tower: position, team stripe, name with a points bar measured
 * against the leader, the gap, the points. The leader's number is gold only once the title is won.
 */
export function TitleFight({ standings, count = 8, decided = false, compact = false }: { standings: DriverStanding[]; count?: number; decided?: boolean; compact?: boolean }) {
  const leaderPoints = Number(standings[0]?.points) || 1;
  return (
    <View>
      {standings.slice(0, count).map((s, i) => {
        const points = Number(s.points);
        const color = teamBrand(s.Constructors[s.Constructors.length - 1]?.name).color;
        return (
          <Link key={s.Driver.driverId} href={`/drivers/${s.Driver.driverId}`} asChild>
            <Pressable className="flex-row items-center gap-3 border-b border-line py-2.5 transition-colors hover:bg-lifted">
              <Text className={`w-[26px] font-display text-[24px] tnum ${i === 0 && decided ? 'text-gold' : 'text-muted'}`}>{i + 1}</Text>
              <View className="h-[30px] w-1" style={{ backgroundColor: color }} />
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text numberOfLines={1} className="font-body-semi text-[16px] text-paper">
                    {compact ? s.Driver.familyName : `${s.Driver.givenName} ${s.Driver.familyName}`}
                  </Text>
                  {i === 0 && decided ? <ChampionChip /> : null}
                </View>
                <View className="mt-1.5 h-1" style={{ width: `${Math.max(1.5, (points / leaderPoints) * 100)}%`, backgroundColor: color }} />
              </View>
              <Text className="w-11 text-right font-display text-[16px] text-muted tnum">{i === 0 ? '' : `-${leaderPoints - points}`}</Text>
              <Text className="w-[46px] text-right font-display text-[24px] text-paper tnum">{s.points}</Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

/** One line on the race behind the leader: how close the next few are, and how much is left. */
export function fightForSecond(standings: DriverStanding[], pointsLeft: number) {
  const chasers = standings.slice(1, 6);
  if (chasers.length < 2) return null;
  const spread = Number(chasers[0].points) - Number(chasers[chasers.length - 1].points);
  return `The fight for second: ${chasers.length} drivers inside ${spread} points, with ${pointsLeft} still to win.`;
}
