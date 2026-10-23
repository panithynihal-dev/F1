import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Text, useWindowDimensions, View } from 'react-native';

import type { ConstructorStanding, DriverStanding } from '@/api/types';
import { Card, Page, PageTitle } from '@/components/layout/Page';
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
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ErrorState, errorMessage, SkeletonRows } from '@/components/ui/States';
import { getConstructorStandings, getDriverStandings } from '@/data/repository';
import { useConstructorStats, useDriverStats } from '@/data/useStats';
import type { StatsScope } from '@/domain/stats';
import { teamBrand } from '@/domain/teamBrand';

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

  const set = (next: Partial<{ tab: Tab; scope: StatsScope; id: string | undefined }>) =>
    router.setParams({ tab, scope, id: params.id, ...next });

  const selectedId = params.id ?? (wide ? defaultId(tab, drivers.data, constructors.data) : undefined);

  return (
    <Page>
      <Head>
        <title>Standings · TrackiMetrix</title>
      </Head>
      <PageTitle title="Standings" kicker={`${new Date().getUTCFullYear()} season`}>
        <TogglePill label="Career stats" active={scope === 'career'} onToggle={() => set({ scope: scope === 'career' ? 'season' : 'career' })} />
      </PageTitle>
      <View className="mb-4 max-w-[420px]">
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

      {active.isError ? (
        <ErrorState title="The standings didn't load" detail={errorMessage(active.error)} onRetry={() => active.refetch()} />
      ) : (
        <View className="items-start gap-6 md:flex-row">
          <Card className="w-full overflow-hidden md:flex-1">
            {active.isPending ? (
              <SkeletonRows count={10} />
            ) : tab === 'drivers' ? (
              drivers.data?.map((s, i) => (
                <View key={s.Driver.driverId} className={i ? 'border-t border-line/60' : ''}>
                  <StandingRow
                    position={s.position ?? s.positionText}
                    teamName={s.Constructors[0]?.name}
                    name={`${s.Driver.givenName} ${s.Driver.familyName}`}
                    detail={[s.Constructors.map((c) => c.name).join(', '), gapText(s.points, drivers.data?.[0]?.points)].filter(Boolean).join(', ')}
                    figure={<Points value={s.points} />}
                    bar={{ fraction: Number(s.points) / (Number(drivers.data?.[0]?.points) || 1), color: teamBrand(s.Constructors.at(-1)?.name).color }}
                    selected={wide ? selectedId === s.Driver.driverId : undefined}
                    onPress={wide ? () => set({ id: s.Driver.driverId }) : undefined}
                    href={wide ? undefined : `/drivers/${s.Driver.driverId}?scope=${scope}`}
                  />
                </View>
              ))
            ) : (
              constructors.data?.map((s, i) => (
                <View key={s.Constructor.constructorId} className={i ? 'border-t border-line/60' : ''}>
                  <StandingRow
                    position={s.position ?? s.positionText}
                    teamName={s.Constructor.name}
                    name={s.Constructor.name}
                    detail={[`${s.wins} ${s.wins === '1' ? 'win' : 'wins'}`, gapText(s.points, constructors.data?.[0]?.points)].filter(Boolean).join(', ')}
                    figure={<Points value={s.points} />}
                    bar={{ fraction: Number(s.points) / (Number(constructors.data?.[0]?.points) || 1), color: teamBrand(s.Constructor.name).color }}
                    selected={wide ? selectedId === s.Constructor.constructorId : undefined}
                    onPress={wide ? () => set({ id: s.Constructor.constructorId }) : undefined}
                    href={wide ? undefined : `/teams/${s.Constructor.constructorId}?scope=${scope}`}
                  />
                </View>
              ))
            )}
          </Card>

          {wide && selectedId ? (
            <View className="sticky top-6 w-[400px]">
              {tab === 'drivers' ? (
                <DriverPanel standing={drivers.data?.find((s) => s.Driver.driverId === selectedId)} scope={scope} />
              ) : (
                <ConstructorDetail standing={constructors.data?.find((s) => s.Constructor.constructorId === selectedId)} scope={scope} />
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
    <Text className="min-w-[64px] text-right font-body-semi text-[16px] text-white tnum">
      {value}
      <Text className="font-body text-[13px] text-muted"> pts</Text>
    </Text>
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
          <Text className="font-display text-[28px] leading-[30px] text-white">
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
          <Text className="font-display text-[28px] leading-[30px] text-white">{standing.Constructor.name}</Text>
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
