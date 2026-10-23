import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Text, View } from 'react-native';

import type { RaceWithResults } from '@/api/types';
import { Card, Page, SectionTitle } from '@/components/layout/Page';
import { StandingRow } from '@/components/StandingRow';
import { FinishCell, isClassified } from '@/components/stats/FinishCell';
import { parseScope, ScopeToggle } from '@/components/stats/ScopeToggle';
import { ConstructorPanel, ConstructorStatsGrid, StatsError, StatsLoading } from '@/components/stats/StatPanels';
import { SecondaryButton } from '@/components/ui/Buttons';
import { EmptyState, ErrorState, errorMessage, PageLoading } from '@/components/ui/States';
import { getConstructorSeasonRaces, getConstructorStandings, getDriverStandings } from '@/data/repository';
import { useConstructorStats } from '@/data/useStats';
import { PointsChart } from '@/components/stats/PointsChart';
import { teamBrand } from '@/domain/teamBrand';

export default function TeamPage() {
  const params = useLocalSearchParams<{ id: string; scope?: string }>();
  const scope = parseScope(params.scope);
  const standings = useQuery({ queryKey: ['constructorStandings'], queryFn: getConstructorStandings });
  const drivers = useQuery({ queryKey: ['driverStandings'], queryFn: getDriverStandings });
  const races = useQuery({ queryKey: ['constructorSeasonRaces', params.id], queryFn: () => getConstructorSeasonRaces(params.id) });
  const stats = useConstructorStats(params.id, scope);

  if (standings.isPending || races.isPending) return <PageLoading />;
  const standing = standings.data?.find((s) => s.Constructor.constructorId === params.id);
  const constructor = standing?.Constructor ?? races.data?.[0]?.Results?.[0]?.Constructor;
  if (!constructor) {
    return (
      <Page>
        {races.isError ? (
          <ErrorState title="This team didn't load" detail={errorMessage(races.error)} onRetry={() => races.refetch()} />
        ) : (
          <EmptyState title="No team at this address" detail="They may not have raced this season." />
        )}
      </Page>
    );
  }

  const lineup = (drivers.data ?? []).filter((d) => d.Constructors.some((c) => c.constructorId === params.id));

  return (
    <Page>
      <Head>
        <title>{`${constructor.name} · TrackiMetrix`}</title>
      </Head>

      <View
        className="-mx-4 mb-8 flex-row flex-wrap items-center gap-5 rounded-card px-4 py-5 md:-mx-6 md:px-6"
        style={{ backgroundImage: `linear-gradient(100deg, ${teamBrand(constructor.name).color}33, transparent 65%)` } as object}
      >
        <ConstructorPanel teamName={constructor.name} width={120} height={140} />
        <View className="min-w-[240px] flex-1 gap-1">
          {standing ? (
            <Text className="font-display-semi text-[17px] text-red">
              P{standing.position ?? standing.positionText} in the constructors’ championship, {standing.points} points
            </Text>
          ) : null}
          <Text accessibilityRole="header" className="font-display text-[44px] leading-[46px] text-white md:text-[56px] md:leading-[58px]">
            {constructor.name}
          </Text>
          <Text className="font-body text-[16px] text-muted">{constructor.nationality}</Text>
        </View>
      </View>

      <View className="gap-10 md:flex-row md:gap-8">
        <View className="gap-6 md:w-[400px]">
          <View className="gap-4">
            <View className="max-w-[360px]">
              <ScopeToggle scope={scope} careerLabel="All time" />
            </View>
            {stats.isPending ? (
              <StatsLoading scope={scope} />
            ) : stats.isError ? (
              <StatsError onRetry={() => stats.refetch()} />
            ) : (
              <ConstructorStatsGrid stats={stats.data} />
            )}
            {stats.data?.scope === 'career' && stats.data.constructorsTitles.length ? (
              <Text className="font-body text-[14px] leading-5 text-muted">
                Constructors’ titles: {stats.data.constructorsTitles.join(', ')}
              </Text>
            ) : null}
          </View>
          {lineup.length ? (
            <View>
              <SectionTitle>Drivers</SectionTitle>
              <Card className="overflow-hidden">
                {lineup.map((d, i) => (
                  <View key={d.Driver.driverId} className={i ? 'border-t border-line/60' : ''}>
                    <StandingRow
                      position={d.position ?? d.positionText}
                      teamName={constructor.name}
                      name={`${d.Driver.givenName} ${d.Driver.familyName}`}
                      figure={`${d.points} pts`}
                      href={`/drivers/${d.Driver.driverId}`}
                    />
                  </View>
                ))}
              </Card>
            </View>
          ) : null}
          <SecondaryButton href={`/standings?tab=constructors&id=${constructor.constructorId}&scope=${scope}`}>Back to standings</SecondaryButton>
        </View>

        <View className="md:flex-1">
          <SectionTitle>Points this season</SectionTitle>
          <View className="mb-8">
            <PointsChart
              color={teamBrand(constructor.name).color}
              rounds={(races.data ?? []).map((r) => ({
                round: r.round,
                name: r.raceName.replace(' Grand Prix', ' GP'),
                points: (r.Results ?? []).reduce((sum, x) => sum + Number(x.points), 0),
              }))}
            />
          </View>
          <SectionTitle>Race by race</SectionTitle>
          <TeamRaces races={races.data ?? []} accent={teamBrand(constructor.name).color} />
        </View>
      </View>
    </Page>
  );
}

function TeamRaces({ races, accent }: { races: RaceWithResults[]; accent: string }) {
  if (!races.length) return <EmptyState title="No races yet" detail="Results appear here after each round." />;
  return (
    <Card className="overflow-hidden">
      {races.map((race, i) => {
        const results = race.Results ?? [];
        const points = results.reduce((sum, r) => sum + Number(r.points), 0);
        return (
          <View key={race.round} className={`flex-row items-center gap-3 px-4 py-2.5 ${i ? 'border-t border-line/60' : ''}`}>
            <Text className="w-7 font-display text-[16px] text-muted tnum">{race.round}</Text>
            <Text numberOfLines={1} className="min-w-0 flex-1 font-body-semi text-[15px] text-white">
              {race.raceName.replace(' Grand Prix', ' GP')}
            </Text>
            <View className="flex-row gap-1.5">
              {results.map((r) => (
                <FinishCell key={r.Driver.driverId} position={r.position} classified={isClassified(r.positionText)} points={Number(r.points)} />
              ))}
            </View>
            <Text className="w-14 text-right font-body-semi text-[15px] tnum" style={{ color: points ? accent : '#9A9AA2' }}>
              {points ? `+${points}` : '–'}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}
