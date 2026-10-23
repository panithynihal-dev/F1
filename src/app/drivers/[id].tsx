import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Text, View } from 'react-native';

import type { JolpicaDriver, RaceWithResults } from '@/api/types';
import { Card, Page, SectionTitle } from '@/components/layout/Page';
import { FinishCell, isClassified } from '@/components/stats/FinishCell';
import { parseScope, ScopeToggle } from '@/components/stats/ScopeToggle';
import { DriverNumberTile, DriverStatsGrid, StatsError, StatsLoading, TitleRuns } from '@/components/stats/StatPanels';
import { SecondaryButton } from '@/components/ui/Buttons';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { EmptyState, ErrorState, errorMessage, PageLoading } from '@/components/ui/States';
import { getDriverSeasonRaces, getDriverStandings } from '@/data/repository';
import { useDriverStats } from '@/data/useStats';
import { PointsChart } from '@/components/stats/PointsChart';
import { teamBrand } from '@/domain/teamBrand';
import { useNow } from '@/hooks/useNow';

export default function DriverPage() {
  const params = useLocalSearchParams<{ id: string; scope?: string }>();
  const scope = parseScope(params.scope);
  const standings = useQuery({ queryKey: ['driverStandings'], queryFn: getDriverStandings });
  const races = useQuery({ queryKey: ['driverSeasonRaces', params.id], queryFn: () => getDriverSeasonRaces(params.id) });
  const stats = useDriverStats(params.id, scope);
  const now = useNow(60 * 60_000);

  if (standings.isPending || races.isPending) return <PageLoading />;
  const standing = standings.data?.find((s) => s.Driver.driverId === params.id);
  // Someone not in this year's table (a reserve, a shared link to a past driver) still has a page,
  // drawn from their results.
  const driver: JolpicaDriver | undefined = standing?.Driver ?? races.data?.[0]?.Results?.[0]?.Driver;
  const team = standing?.Constructors[standing.Constructors.length - 1]?.name ?? races.data?.at(-1)?.Results?.[0]?.Constructor.name;

  if (!driver) {
    return (
      <Page>
        {races.isError ? (
          <ErrorState title="This driver didn't load" detail={errorMessage(races.error)} onRetry={() => races.refetch()} />
        ) : (
          <EmptyState title="No driver at this address" detail="They may not have raced this season." />
        )}
      </Page>
    );
  }

  const name = `${driver.givenName} ${driver.familyName}`;
  const age = driver.dateOfBirth ? Math.floor((now - Date.parse(driver.dateOfBirth)) / (365.25 * 86_400_000)) : null;

  return (
    <Page>
      <Head>
        <title>{`${name} · TrackiMetrix`}</title>
      </Head>

      <View
        className="-mx-4 mb-8 flex-row flex-wrap items-center gap-5 rounded-card px-4 py-5 md:-mx-6 md:px-6"
        style={{ backgroundImage: `linear-gradient(100deg, ${teamBrand(team).color}33, transparent 65%)` } as object}
      >
        <DriverNumberTile teamName={team} number={driver.permanentNumber} width={120} height={140} />
        <View className="min-w-[240px] flex-1 gap-1">
          {standing ? (
            <Text className="font-display-semi text-[17px] text-red">
              P{standing.position ?? standing.positionText} in the championship, {standing.points} points
            </Text>
          ) : null}
          <Text accessibilityRole="header" className="font-display text-[44px] leading-[46px] text-white md:text-[56px] md:leading-[58px]">
            {name}
          </Text>
          <Text className="font-body text-[16px] text-muted">{[team, driver.nationality, age ? `${age} years old` : null].filter(Boolean).join(', ')}</Text>
        </View>
      </View>

      <View className="gap-10 md:flex-row md:gap-8">
        <View className="gap-4 md:w-[400px]">
          <View className="max-w-[360px]">
            <ScopeToggle scope={scope} />
          </View>
          {stats.isPending ? (
            <StatsLoading scope={scope} />
          ) : stats.isError ? (
            <StatsError onRetry={() => stats.refetch()} />
          ) : (
            <View className="gap-6">
              <DriverStatsGrid stats={stats.data} />
              {stats.data.titleRuns.length ? (
                <View className="gap-3">
                  <SectionTitle>World titles</SectionTitle>
                  <TitleRuns runs={stats.data.titleRuns} />
                </View>
              ) : null}
            </View>
          )}
          <SecondaryButton href={`/standings?tab=drivers&id=${driver.driverId}&scope=${scope}`}>Back to standings</SecondaryButton>
        </View>

        <View className="md:flex-1">
          <SectionTitle>Points this season</SectionTitle>
          <View className="mb-8">
            <PointsChart
              color={teamBrand(team).color}
              rounds={(races.data ?? []).map((r) => ({
                round: r.round,
                name: r.raceName.replace(' Grand Prix', ' GP'),
                points: Number(r.Results?.find((x) => x.Driver.driverId === driver.driverId)?.points ?? 0),
              }))}
            />
          </View>
          <SectionTitle>Race by race</SectionTitle>
          <SeasonRaces races={races.data ?? []} driverId={driver.driverId} />
        </View>
      </View>
    </Page>
  );
}

function SeasonRaces({ races, driverId }: { races: RaceWithResults[]; driverId: string }) {
  if (!races.length) return <EmptyState title="No races yet" detail="Results appear here after each round." />;
  return (
    <Card className="overflow-hidden">
      {races.map((race, i) => {
        const result = race.Results?.find((r) => r.Driver.driverId === driverId);
        if (!result) return null;
        const classified = isClassified(result.positionText);
        return (
          <View key={race.round} className={`flex-row items-center gap-3 px-4 py-2.5 ${i ? 'border-t border-line/60' : ''}`}>
            <Text className="w-7 font-display text-[16px] text-muted tnum">{race.round}</Text>
            <FinishCell position={result.position} classified={classified} points={Number(result.points)} />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="font-body-semi text-[15px] text-white">
                {race.raceName.replace(' Grand Prix', ' GP')}
              </Text>
              <Text numberOfLines={1} className="font-body text-[13px] text-muted">
                {result.grid === '0' ? 'Pit lane start' : `Started P${result.grid}`}
                {classified ? '' : `, ${result.status}`}
                {result.FastestLap?.rank === '1' ? ', fastest lap' : ''}
              </Text>
            </View>
            <TeamBadge teamName={result.Constructor.name} />
            <Text className="w-14 text-right font-body-semi text-[15px] text-white tnum">{result.points === '0' ? '–' : `+${result.points}`}</Text>
          </View>
        );
      })}
    </Card>
  );
}
