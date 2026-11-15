import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import type { ConstructorStanding, DriverStanding, RaceWithResults } from '@/api/types';
import { Page, SectionTitle } from '@/components/layout/Page';
import { FinishCell, isClassified } from '@/components/stats/FinishCell';
import { PointsChart } from '@/components/stats/PointsChart';
import { parseScope, ScopeToggle } from '@/components/stats/ScopeToggle';
import { ConstructorStatsGrid, StatsError, StatsLoading } from '@/components/stats/StatPanels';
import { SecondaryButton } from '@/components/ui/Buttons';
import { ChampionChip } from '@/components/ui/ChampionChip';
import { CreditedImage } from '@/components/ui/CreditedImage';
import { HelmetText } from '@/components/ui/HelmetText';
import { EmptyState, ErrorState, errorMessage, PageLoading } from '@/components/ui/States';
import { teamPhoto } from '@/data/photos';
import {
  getConstructorSeasonQualifyingRaces,
  getConstructorSeasonRaces,
  getConstructorSeasonSprintRaces,
  getConstructorStandings,
  getDriverStandings,
  getSchedule,
} from '@/data/repository';
import { useConstructorStats } from '@/data/useStats';
import { isClinched, maxPointsLeft, racesLeft } from '@/domain/clinch';
import { teamPalette } from '@/domain/helmets';
import { isClassifiedResult, pointsByRound, teammateHeadToHead } from '@/domain/season';
import { teamBrand } from '@/domain/teamBrand';
import { useNow } from '@/hooks/useNow';

export default function TeamPage() {
  const params = useLocalSearchParams<{ id: string; scope?: string }>();
  const scope = parseScope(params.scope);
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const now = useNow(60 * 60_000);
  const standings = useQuery({ queryKey: ['constructorStandings'], queryFn: getConstructorStandings });
  const drivers = useQuery({ queryKey: ['driverStandings'], queryFn: getDriverStandings });
  const schedule = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });
  const races = useQuery({ queryKey: ['constructorSeasonRaces', params.id], queryFn: () => getConstructorSeasonRaces(params.id) });
  const sprints = useQuery({ queryKey: ['constructorSprintRaces', params.id], queryFn: () => getConstructorSeasonSprintRaces(params.id) });
  const qualifying = useQuery({ queryKey: ['constructorQualifyingRaces', params.id], queryFn: () => getConstructorSeasonQualifyingRaces(params.id) });
  const stats = useConstructorStats(params.id, scope);

  // The rival on the points chart: the leader against second, everyone else against the leader.
  const index = standings.data?.findIndex((s) => s.Constructor.constructorId === params.id) ?? -1;
  const rival = index >= 0 ? standings.data?.[index === 0 ? 1 : 0] : undefined;
  const rivalId = rival?.Constructor.constructorId;
  const rivalRaces = useQuery({ queryKey: ['constructorSeasonRaces', rivalId], queryFn: () => getConstructorSeasonRaces(rivalId!), enabled: !!rivalId });
  const rivalSprints = useQuery({ queryKey: ['constructorSprintRaces', rivalId], queryFn: () => getConstructorSeasonSprintRaces(rivalId!), enabled: !!rivalId });

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

  const color = teamBrand(constructor.name).color;
  const season = schedule.data?.[0]?.season ?? '';
  const champion =
    index === 0 && !!schedule.data && !!standings.data && isClinched(standings.data.map((s) => Number(s.points)), maxPointsLeft(schedule.data, 'constructors', now));
  const roundsLeft = schedule.data ? racesLeft(schedule.data, now) : 0;
  const gap = standing && standings.data ? (index === 0 ? Number(standing.points) - Number(standings.data[1]?.points ?? 0) : Number(standing.points) - Number(standings.data[0].points)) : null;
  const lineup = (drivers.data ?? []).filter((d) => d.Constructors.at(-1)?.constructorId === params.id).slice(0, 2);

  const allResults = (races.data ?? []).flatMap((r) => r.Results ?? []);
  const oneTwos = (races.data ?? []).filter((r) => {
    const pos = (r.Results ?? []).filter(isClassifiedResult).map((x) => Number(x.position)).sort((a, b) => a - b);
    return pos[0] === 1 && pos[1] === 2;
  }).length;
  const podiums = allResults.filter((r) => isClassifiedResult(r) && Number(r.position) <= 3).length;
  const poles = (qualifying.data ?? []).filter((r) => r.QualifyingResults?.some((q) => q.position === '1')).length;
  const headline = [
    standing ? { value: standing.points, label: 'points' } : null,
    standing ? { value: standing.wins, label: 'wins' } : null,
    { value: String(oneTwos), label: 'one-twos' },
    { value: String(podiums), label: 'podiums' },
    { value: String(poles), label: 'poles' },
    gap != null && rival ? { value: gap > 0 ? `+${gap}` : String(gap), label: index === 0 ? `clear of ${rival.Constructor.name}` : 'to the leader' } : null,
  ].filter((s): s is { value: string; label: string } => s != null);

  const mine = pointsByRound(races.data ?? [], sprints.data ?? [], () => true);
  const theirs = rival && rivalRaces.data ? pointsByRound(rivalRaces.data, rivalSprints.data ?? [], () => true) : null;
  const photo = teamPhoto(constructor.constructorId);

  return (
    <>
      <Head>
        <title>{`${constructor.name} · TrackiMetrix`}</title>
      </Head>

      <CreditedImage photo={photo} scrim={wide ? 'left' : 'phone'} eager tint={color} className="border-b border-line">
        <View className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: color }} />
        <View className="mx-auto w-full max-w-page px-4 pb-7 md:px-8 md:pb-14" style={{ minHeight: wide ? 560 : 540, justifyContent: 'flex-end' }}>
          <View className="flex-row flex-wrap items-center gap-2.5">
            {champion ? (
              <ChampionChip label={`${season} Constructors’ Champions`} />
            ) : standing ? (
              <View className="tm-slant bg-red px-3 py-0.5">
                <Text className="font-display text-[15px] uppercase tracking-[0.04em] text-white">P{standing.position ?? standing.positionText} in {season}</Text>
              </View>
            ) : null}
            <Text className="font-display-semi text-[15px] tracking-[0.04em] text-muted">{constructor.nationality}</Text>
          </View>
          <View className="mt-3.5">
            <HelmetText palette={teamPalette(constructor.constructorId, constructor.name)} size={wide ? 128 : 72} as="h1">
              {constructor.name}
            </HelmetText>
          </View>
          {champion ? (
            <Text className="mt-2.5 max-w-[560px] font-body text-[15px] leading-[22px] text-muted md:text-[17px] md:leading-[25px]">
              The {season} constructors’ title is theirs{roundsLeft ? `, ${gap} points clear with ${roundsLeft} ${roundsLeft === 1 ? 'round' : 'rounds'} to go` : ''}.
            </Text>
          ) : null}
          <View className="mt-6 flex-row flex-wrap gap-x-[22px] gap-y-3 md:gap-x-11">
            {(wide ? headline : headline.slice(0, 3)).map((s) => (
              <View key={s.label}>
                <Text className="font-display text-[34px] leading-[34px] text-paper tnum md:text-[52px] md:leading-[52px]">{s.value}</Text>
                <Text className="mt-1 font-body text-[14px] text-muted">{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </CreditedImage>

      <Page>
        <View className="gap-14 md:gap-16">
          <View className="gap-14 md:flex-row md:gap-16">
            {lineup.length === 2 && races.data ? (
              <View className="md:w-[560px]">
                <TeammateBattle a={lineup[0]} b={lineup[1]} races={races.data} qualifying={qualifying.data ?? []} color={color} rounds={races.data.length} />
              </View>
            ) : null}
            {standings.data ? (
              <View className="md:flex-1">
                <ConstructorsMini standings={standings.data} current={constructor.constructorId} />
              </View>
            ) : null}
          </View>

          {races.data?.length && lineup.length ? (
            <View>
              <SectionTitle
                aside={<Text className="hidden font-body text-[14px] text-muted md:flex">Finishing position for each car, and the team’s points (Grand Prix plus sprint).</Text>}
              >
                Every weekend
              </SectionTitle>
              {wide ? (
                <EveryWeekendGrid races={races.data} points={mine} lineup={lineup} color={color} />
              ) : (
                <EveryWeekendList races={races.data} points={mine} lineup={lineup} />
              )}
            </View>
          ) : null}

          {mine.length >= 2 ? (
            <View>
              <SectionTitle aside={<Text className="hidden font-body text-[14px] text-muted md:flex">Grand Prix and sprint points, by round</Text>}>The points race</SectionTitle>
              <PointsChart
                series={[
                  { label: constructor.name, color, rounds: mine },
                  ...(theirs && rival ? [{ label: rival.Constructor.name, color: teamBrand(rival.Constructor.name).color, rounds: theirs }] : []),
                ]}
              />
            </View>
          ) : null}

          <View className="gap-4 md:max-w-[560px]">
            <SectionTitle>In numbers</SectionTitle>
            <ScopeToggle scope={scope} careerLabel="All time" />
            {stats.isPending ? <StatsLoading scope={scope} /> : stats.isError ? <StatsError onRetry={() => stats.refetch()} /> : <ConstructorStatsGrid stats={stats.data} />}
            {stats.data?.scope === 'career' && stats.data.constructorsTitles.length ? (
              <Text className="font-body text-[14px] leading-5 text-muted">Constructors’ titles: {stats.data.constructorsTitles.join(', ')}</Text>
            ) : null}
            <SecondaryButton href={`/standings?tab=constructors&id=${constructor.constructorId}&scope=${scope}`}>Back to standings</SecondaryButton>
          </View>
        </View>
      </Page>
    </>
  );
}

/** The two race drivers against each other, each category a split bar leaning to whoever leads it. */
function TeammateBattle({ a, b, races, qualifying, color, rounds }: { a: DriverStanding; b: DriverStanding; races: RaceWithResults[]; qualifying: RaceWithResults[]; color: string; rounds: number }) {
  const rows = teammateHeadToHead(a.Driver.driverId, b.Driver.driverId, qualifying, races, { a: Number(a.points), b: Number(b.points) });
  return (
    <View>
      <SectionTitle aside={<Text className="hidden font-body text-[14px] text-muted md:flex">Who beat whom, {rounds} rounds</Text>}>Teammate battle</SectionTitle>
      <View className="border border-line bg-surface p-4 md:p-6">
        <View className="flex-row items-end justify-between border-b border-strong pb-2.5">
          {[a, b].map((d, i) => (
            <Link key={d.Driver.driverId} href={`/drivers/${d.Driver.driverId}`} asChild>
              <Pressable className={i ? 'items-end' : ''}>
                <Text className="font-display-semi text-[15px] tracking-[0.04em] text-muted">Car {d.Driver.permanentNumber}</Text>
                <Text className="font-title text-[30px] uppercase leading-[30px] text-paper md:text-[38px] md:leading-[36px]">{d.Driver.familyName}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
        {rows.map((r) => (
          <View key={r.label} className="border-b border-line py-3" accessibilityLabel={`${r.label}: ${a.Driver.familyName} ${r.a}, ${b.Driver.familyName} ${r.b}`}>
            <View className="flex-row items-baseline justify-between">
              <Text className="font-display text-[24px] tnum" style={{ color: r.a > r.b ? color : '#F3F3F1' }}>
                {r.a}
              </Text>
              <Text className="font-display-semi text-[15px] tracking-[0.04em] text-muted">{r.label}</Text>
              <Text className="font-display text-[24px] tnum" style={{ color: r.b > r.a ? color : '#F3F3F1' }}>
                {r.b}
              </Text>
            </View>
            <View className="mt-1.5 h-1.5 flex-row gap-1">
              <View style={{ flex: Math.max(r.a, 0.001), backgroundColor: r.a >= r.b ? color : '#3A404A' }} />
              <View style={{ flex: Math.max(r.b, 0.001), backgroundColor: r.b > r.a ? color : '#3A404A' }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ConstructorsMini({ standings, current }: { standings: ConstructorStanding[]; current: string }) {
  const lead = Number(standings[0]?.points) || 1;
  return (
    <View>
      <SectionTitle aside={<Text className="font-body text-[14px] text-muted">Top six</Text>}>Constructors</SectionTitle>
      {standings.slice(0, 6).map((c) => {
        const col = teamBrand(c.Constructor.name).color;
        const me = c.Constructor.constructorId === current;
        return (
          <Link key={c.Constructor.constructorId} href={`/teams/${c.Constructor.constructorId}`} asChild>
            <Pressable className={`flex-row items-center gap-3 border-b border-line px-3 py-2.5 hover:bg-lifted ${me ? 'bg-lifted' : ''}`}>
              <Text className="w-5 font-display text-[18px] text-muted tnum">{c.position ?? c.positionText}</Text>
              <View className="h-6 w-1" style={{ backgroundColor: col }} />
              <Text numberOfLines={1} className="w-[110px] font-body-semi text-[15px] text-paper md:w-[120px]">
                {c.Constructor.name}
              </Text>
              <View className="flex-1">
                <View className="h-1.5" style={{ width: `${(Number(c.points) / lead) * 100}%`, backgroundColor: col }} />
              </View>
              <Text className="w-11 text-right font-display text-[20px] text-paper tnum">{c.points}</Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

type Lineup = DriverStanding[];
const resultFor = (race: RaceWithResults, driverId: string) => race.Results?.find((r) => r.Driver.driverId === driverId);

/** Rounds as columns: each car's finish, then the team's points that weekend as a bar. */
function EveryWeekendGrid({ races, points, lineup, color }: { races: RaceWithResults[]; points: { round: string; points: number }[]; lineup: Lineup; color: string }) {
  const top = Math.max(1, ...points.map((p) => p.points));
  const byRound = new Map(points.map((p) => [p.round, p.points]));
  const cell = 48;
  return (
    <View className="flex-row gap-1">
      <View className="w-[90px] gap-1.5 pt-[23px]">
        {lineup.map((d) => (
          <Text key={d.Driver.driverId} className="h-12 font-display-semi text-[15px] leading-[48px] tracking-[0.04em] text-muted">
            {d.Driver.familyName}
          </Text>
        ))}
        <Text className="mt-1.5 h-20 pt-14 font-display-semi text-[15px] tracking-[0.04em] text-muted">Team pts</Text>
      </View>
      {races.map((race) => {
        const pts = byRound.get(race.round) ?? 0;
        return (
          <View key={race.round} className="flex-1 items-center gap-1.5" accessibilityLabel={`Round ${race.round}: ${pts} points`}>
            <Text className="font-display text-[14px] text-muted">{race.round}</Text>
            {lineup.map((d) => {
              const r = resultFor(race, d.Driver.driverId);
              return r ? (
                <FinishCell key={d.Driver.driverId} position={r.position} classified={isClassified(r.positionText)} points={Number(r.points)} size={cell} />
              ) : (
                <View key={d.Driver.driverId} style={{ width: cell, height: cell }} />
              );
            })}
            <View className="mt-1.5 h-20 justify-end" style={{ width: cell }}>
              <View style={{ height: `${(pts / top) * 100}%`, backgroundColor: color, opacity: pts / top > 0.75 ? 0.95 : 0.5 }} />
            </View>
            <Text className="font-display text-[16px] text-paper tnum">{pts}</Text>
            <Text className="font-body text-[11px] uppercase tracking-[0.04em] text-muted">{race.Circuit.Location.country.slice(0, 3)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function EveryWeekendList({ races, points, lineup }: { races: RaceWithResults[]; points: { round: string; points: number }[]; lineup: Lineup }) {
  const byRound = new Map(points.map((p) => [p.round, p.points]));
  return (
    <View>
      <View className="flex-row gap-2.5 border-b border-strong pb-2">
        <Text className="flex-1 font-display-semi text-[15px] text-muted">Race</Text>
        {lineup.map((d) => (
          <Text key={d.Driver.driverId} className="w-[30px] text-center font-display-semi text-[15px] text-muted">
            {d.Driver.code ?? d.Driver.familyName.slice(0, 3).toUpperCase()}
          </Text>
        ))}
        <Text className="w-9 text-right font-display-semi text-[15px] text-muted">Pts</Text>
      </View>
      {[...races].reverse().slice(0, 8).map((race) => (
        <View key={race.round} className="flex-row items-center gap-2.5 border-b border-line py-2.5">
          <Text className="w-[22px] font-display text-[16px] text-muted tnum">{race.round}</Text>
          <Text numberOfLines={1} className="flex-1 font-body-semi text-[15px] text-paper">
            {race.raceName.replace(' Grand Prix', ' GP')}
          </Text>
          {lineup.map((d) => {
            const r = resultFor(race, d.Driver.driverId);
            return r ? <FinishCell key={d.Driver.driverId} position={r.position} classified={isClassified(r.positionText)} points={Number(r.points)} size={30} /> : <View key={d.Driver.driverId} className="w-[30px]" />;
          })}
          <Text className="w-9 text-right font-display text-[18px] text-paper tnum">{byRound.get(race.round) ?? 0}</Text>
        </View>
      ))}
    </View>
  );
}
