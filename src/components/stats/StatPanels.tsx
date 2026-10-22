import { Text, View } from 'react-native';

import type { ConstructorStats, DriverStats, StatsScope, TitleRun } from '@/domain/stats';
import { titleCount } from '@/domain/stats';
import { teamBrand } from '@/domain/teamBrand';

import { DriverNumberTile } from '../ui/DriverNumberTile';
import { LoadingCar } from '../ui/LoadingCar';
import { SecondaryButton } from '../ui/Buttons';

export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="min-w-[96px] flex-1 rounded-inner bg-lifted px-3 py-3">
      <Text className="font-display text-[30px] leading-[32px] text-white tnum">{value}</Text>
      <Text className="font-body-medium text-[13px] text-muted">{label}</Text>
    </View>
  );
}

/** Four tiles in both scopes so the panel doesn't reflow when the scope flips. */
export function DriverStatsGrid({ stats }: { stats: DriverStats }) {
  const titles = titleCount(stats.titleRuns);
  return (
    <View className="flex-row flex-wrap gap-2">
      <StatTile label={stats.scope === 'season' ? 'Races' : 'Starts'} value={stats.starts} />
      <StatTile label="Wins" value={stats.wins} />
      <StatTile label="Podiums" value={stats.podiums} />
      <StatTile label="Poles" value={stats.poles} />
      {stats.scope === 'season' ? (
        <StatTile label="Fastest laps" value={stats.fastestLaps ?? 0} />
      ) : (
        <StatTile label={titles === 1 ? 'World title' : 'World titles'} value={titles} />
      )}
    </View>
  );
}

/**
 * Every title laid out under the team it was won with, in that team's colour — so seven titles
 * beside today's Ferrari tile can't be read as seven Ferrari titles.
 */
export function TitleRuns({ runs }: { runs: TitleRun[] }) {
  if (!runs.length) return null;
  return (
    <View className="gap-3">
      {runs.map((run) => {
        const brand = teamBrand(run.teamName);
        return (
          <View key={run.teamName} className="gap-1.5">
            <Text className="font-body-semi text-[14px] text-muted">{run.teamName}</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {run.seasons.map((season) => (
                <View
                  key={season}
                  className="rounded-badge border px-2 py-0.5"
                  style={{ borderColor: brand.color, backgroundColor: `${brand.color}4D` }}
                >
                  <Text className="font-body-bold text-[13px] text-white tnum">{season}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function ConstructorStatsGrid({ stats }: { stats: ConstructorStats }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      <StatTile label="Constructors' titles" value={stats.constructorsTitles.length} />
      <StatTile label="Drivers' titles" value={stats.driversTitles.length} />
      <StatTile label="Wins" value={stats.wins} />
      {stats.scope === 'season' ? <StatTile label="Poles" value={stats.poles ?? 0} /> : <StatTile label="Starts" value={stats.starts ?? 0} />}
    </View>
  );
}

/** The constructor's stand-in for a headshot: its colour, its code blown up. */
export function ConstructorPanel({ teamName, width, height }: { teamName?: string; width: number; height: number }) {
  const brand = teamBrand(teamName);
  return (
    <View
      className="items-center justify-center rounded-inner border"
      style={{ width, height, borderColor: brand.color, backgroundColor: `${brand.color}4D` }}
    >
      <Text className="font-display text-[34px] text-white">{brand.abbreviation}</Text>
    </View>
  );
}

export function StatsLoading({ scope }: { scope: StatsScope }) {
  return (
    <View className="items-center gap-3 rounded-inner bg-ground py-6">
      <LoadingCar width={220} />
      <Text className="font-body text-[14px] text-muted">{scope === 'career' ? 'Counting a whole career…' : 'Adding up this season…'}</Text>
    </View>
  );
}

export function StatsError({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="items-start gap-2 py-4">
      <Text className="font-body text-[15px] text-white">These stats didn't load. The data service may be busy.</Text>
      <SecondaryButton onPress={onRetry}>Try again</SecondaryButton>
    </View>
  );
}

export { DriverNumberTile };
