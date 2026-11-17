import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Text, useWindowDimensions, View } from 'react-native';

import type { ConstructorStanding, DriverStanding } from '@/api/types';
import { Card, Page, PageTitle } from '@/components/layout/Page';
import { BattleForSecond } from '@/components/standings/BattleForSecond';
import { StandingRow } from '@/components/StandingRow';
import {
  ConstructorPanel,
  ConstructorStatsGrid,
  DriverNumberTile,
  DriverStatsGrid,
  StatsError,
  StatsLoading,
  TitleRuns,
} from '@/components/stats/StatPanels';
import { SecondaryButton, TogglePill } from '@/components/ui/Buttons';
import { ChampionChip } from '@/components/ui/ChampionChip';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ErrorState, errorMessage, SkeletonRows } from '@/components/ui/States';
import { getConstructorStandings, getDriverStandings, getSchedule } from '@/data/repository';
import { useConstructorStats, useDriverStats } from '@/hooks/useStats';
import { isClinched, maxPointsLeft, type Championship } from '@/logic/clinch';
import { raceStart } from '@/logic/dates';
import type { StatsScope } from '@/logic/stats';
import { teamBrand } from '@/logic/teamBrand';
import { useNow } from '@/hooks/useNow';

type Tab = 'drivers' | 'constructors';

// Tab, scope and selection all live in the URL, so a view of "Norris, career" can be shared.
export default function Standings() {
  const params = useLocalSearchParams<{ tab?: Tab; scope?: StatsScope; id?: string }>();
  const tab: Tab = params.tab === 'constructors' ? 'constructors' : 'drivers';
  const scope: StatsScope = params.scope === 'career' ? 'career' : 'season';
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const drivers = useQuery({ queryKey: ['driverStandings'], queryFn: getDriverStandings });
  const constructors = useQuery({ queryKey: ['constructorStandings'], queryFn: getConstructorStandings });
  const active = tab === 'drivers' ? drivers : constructors;
  const schedule = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });
  const now = useNow();
  // Whether each title can still be lost: the leader's gap against everything still on offer.
  const decided = (championship: Championship, points?: string[]) =>
    !!schedule.data && !!points && isClinched(points.map(Number), maxPointsLeft(schedule.data, championship, now));
  const driversDecided = decided('drivers', drivers.data?.map((s) => s.points));
  const constructorsDecided = decided('constructors', constructors.data?.map((s) => s.points));
  const season = schedule.data?.[0]?.season ?? String(new Date().getUTCFullYear());
  const champions = [
    driversDecided && drivers.data?.[0] ? { name: `${drivers.data[0].Driver.givenName} ${drivers.data[0].Driver.familyName}`, rest: ` has won the ${season} drivers’ title.` } : null,
    constructorsDecided && constructors.data?.[0] ? { name: constructors.data[0].Constructor.name, rest: ' have won the constructors’ title.' } : null,
  ].filter((c): c is { name: string; rest: string } => c != null);
  const roundsRun = schedule.data?.filter((r) => (raceStart(r) ?? Infinity) < now).length;
  const driversLeft = schedule.data ? maxPointsLeft(schedule.data, 'drivers', now) : 0;

  const set = (next: Partial<{ tab: Tab; scope: StatsScope; id: string | undefined }>) =>
    router.setParams({ tab, scope, id: params.id, ...next });

  const selectedId = params.id ?? (wide ? defaultId(tab, drivers.data, constructors.data) : undefined);

  return (
    <Page
      header={
        <View className="gap-7">
          <PageTitle title="Standings" kicker={roundsRun != null && schedule.data ? `${season} season, after round ${roundsRun} of ${schedule.data.length}.` : `${season} season.`} />
          {champions.length ? (
            <View className="gap-2.5 border border-gold/45 md:flex-row md:gap-0" style={{ backgroundImage: 'linear-gradient(90deg, rgba(245,197,24,.14), rgba(245,197,24,.02))' } as object}>
              {champions.map((c, i) => (
                <View key={c.name} className={`flex-row items-center gap-3.5 px-5 py-3.5 md:flex-1 md:py-[18px] ${i ? 'md:border-l md:border-gold/30' : ''}`}>
                  <ChampionChip />
                  <Text className="flex-1 font-body text-[16px] text-paper">
                    <Text className="font-body-bold">{c.name}</Text>
                    {c.rest}
                  </Text>
                </View>
              ))}
        </View>
      ) : null}
      <View className="gap-2.5 md:flex-row md:items-center md:justify-between">
        <View className="md:w-[380px]">
          <SegmentedTabs
            label="Championship"
            value={tab}
            onChange={(value) => set({ tab: value, id: undefined })}
            options={[
              { value: 'drivers', label: 'Drivers' },
              { value: 'constructors', label: 'Constructors' },
            ]}
          />
        </View>
        <View className="flex-row gap-1.5" accessibilityRole="radiogroup" accessibilityLabel="Stats period">
          <TogglePill label="This season" active={scope === 'season'} onToggle={() => set({ scope: 'season' })} />
          <TogglePill label="Career" active={scope === 'career'} onToggle={() => set({ scope: 'career' })} />
        </View>
      </View>

        </View>
      }
    >
      <Head>
        <title>Standings · TrackiMetrix</title>
      </Head>
      {active.isError ? (
        <ErrorState title="The standings didn't load" detail={errorMessage(active.error)} onRetry={() => active.refetch()} />
      ) : (
        <View className="items-start gap-8 md:flex-row">
          <View className="w-full md:flex-1">
            {active.isPending ? (
              <SkeletonRows count={10} />
            ) : tab === 'drivers' ? (
              drivers.data?.map((s, i) => (
                <View key={s.Driver.driverId} className="border-b border-line">
                  <StandingRow
                    position={s.position ?? s.positionText}
                    teamName={s.Constructors[0]?.name}
                    name={`${s.Driver.givenName} ${s.Driver.familyName}`}
                    detail={[s.Constructors.map((c) => c.name).join(', '), gapText(s.points, drivers.data?.[0]?.points)].filter(Boolean).join(', ')}
                    figure={<Points value={s.points} />}
                    trailing={i === 0 && driversDecided ? <ChampionChip /> : undefined}
                    bar={{ fraction: Number(s.points) / (Number(drivers.data?.[0]?.points) || 1), color: teamBrand(s.Constructors.at(-1)?.name).color }}
                    selected={wide ? selectedId === s.Driver.driverId : undefined}
                    onPress={wide ? () => set({ id: s.Driver.driverId }) : undefined}
                    href={wide ? undefined : `/drivers/${s.Driver.driverId}?scope=${scope}`}
                  />
                </View>
              ))
            ) : (
              constructors.data?.map((s, i) => (
                <View key={s.Constructor.constructorId} className="border-b border-line">
                  <StandingRow
                    position={s.position ?? s.positionText}
                    teamName={s.Constructor.name}
                    name={s.Constructor.name}
                    detail={[`${s.wins} ${s.wins === '1' ? 'win' : 'wins'}`, gapText(s.points, constructors.data?.[0]?.points)].filter(Boolean).join(', ')}
                    figure={<Points value={s.points} />}
                    trailing={i === 0 && constructorsDecided ? <ChampionChip /> : undefined}
                    bar={{ fraction: Number(s.points) / (Number(constructors.data?.[0]?.points) || 1), color: teamBrand(s.Constructor.name).color }}
                    selected={wide ? selectedId === s.Constructor.constructorId : undefined}
                    onPress={wide ? () => set({ id: s.Constructor.constructorId }) : undefined}
                    href={wide ? undefined : `/teams/${s.Constructor.constructorId}?scope=${scope}`}
                  />
                </View>
              ))
            )}
          </View>

          {tab === 'drivers' && !wide && drivers.data ? (
            <View className="w-full">
              <BattleForSecond standings={drivers.data} pointsLeft={driversLeft} decided={driversDecided} />
            </View>
          ) : null}

          {wide ? (
            <View className="sticky top-6 w-[400px] gap-4 2xl:w-[780px] 2xl:flex-row 2xl:items-start">
              {tab === 'drivers' && drivers.data ? (
                <View className="2xl:flex-1">
                  <BattleForSecond standings={drivers.data} pointsLeft={driversLeft} decided={driversDecided} />
                </View>
              ) : null}
              {!selectedId ? null : (
                <View className="2xl:flex-1">
                  {tab === 'drivers' ? (
                    <DriverPanel standing={drivers.data?.find((s) => s.Driver.driverId === selectedId)} scope={scope} />
                  ) : (
                    <ConstructorDetail standing={constructors.data?.find((s) => s.Constructor.constructorId === selectedId)} scope={scope} />
                  )}
                </View>
              )}
            </View>
          ) : null}
        </View>
      )}
    </Page>
  );
}

/** "52 behind", or nothing for the leader. */
const gapText = (points: string, leader?: string) => {
  const gap = Number(leader) - Number(points);
  return gap > 0 ? `${gap} behind` : null;
};

const defaultId = (tab: Tab, drivers?: DriverStanding[], constructors?: ConstructorStanding[]) =>
  tab === 'drivers' ? drivers?.[0]?.Driver.driverId : constructors?.[0]?.Constructor.constructorId;

function Points({ value }: { value: string }) {
  return (
    <Text className="min-w-[56px] text-right font-display text-[24px] text-paper tnum">{value}</Text>
  );
}

function DriverPanel({ standing, scope }: { standing?: DriverStanding; scope: StatsScope }) {
  const stats = useDriverStats(standing?.Driver.driverId, scope);
  if (!standing) return null;
  const team = standing.Constructors[0]?.name;
  return (
    <Card className="gap-4 p-4">
      <View className="flex-row gap-4">
        <DriverNumberTile teamName={team} number={standing.Driver.permanentNumber} width={96} height={112} />
        <View className="flex-1 justify-center gap-0.5">
          <Text className="font-title text-[30px] uppercase leading-[28px] text-paper">
            {standing.Driver.givenName} {standing.Driver.familyName}
          </Text>
          <Text className="font-body text-[15px] text-muted">{standing.Constructors.map((c) => c.name).join(', ')}</Text>
          <Text className="font-body text-[15px] text-muted">{standing.Driver.nationality}</Text>
        </View>
      </View>
      <Text className="font-body-semi text-[14px] text-muted">{scope === 'career' ? 'Career' : 'This season'}</Text>
      {stats.isPending ? (
        <StatsLoading scope={scope} />
      ) : stats.isError ? (
        <StatsError onRetry={() => stats.refetch()} />
      ) : (
        <View className="gap-4">
          <DriverStatsGrid stats={stats.data} />
          <TitleRuns runs={stats.data.titleRuns} />
        </View>
      )}
      <SecondaryButton href={`/drivers/${standing.Driver.driverId}?scope=${scope}`}>Open driver page</SecondaryButton>
    </Card>
  );
}

function ConstructorDetail({ standing, scope }: { standing?: ConstructorStanding; scope: StatsScope }) {
  const stats = useConstructorStats(standing?.Constructor.constructorId, scope);
  if (!standing) return null;
  return (
    <Card className="gap-4 p-4">
      <View className="flex-row gap-4">
        <ConstructorPanel teamName={standing.Constructor.name} width={96} height={112} />
        <View className="flex-1 justify-center gap-0.5">
          <Text className="font-title text-[30px] uppercase leading-[28px] text-paper">{standing.Constructor.name}</Text>
          <Text className="font-body text-[15px] text-muted">{standing.Constructor.nationality}</Text>
        </View>
      </View>
      <Text className="font-body-semi text-[14px] text-muted">{scope === 'career' ? 'All time' : 'This season'}</Text>
      {stats.isPending ? (
        <StatsLoading scope={scope} />
      ) : stats.isError ? (
        <StatsError onRetry={() => stats.refetch()} />
      ) : (
        <ConstructorStatsGrid stats={stats.data} />
      )}
      <SecondaryButton href={`/teams/${standing.Constructor.constructorId}?scope=${scope}`}>Open team page</SecondaryButton>
    </Card>
  );
}
