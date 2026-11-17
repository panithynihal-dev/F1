import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Text, useWindowDimensions, View } from 'react-native';

import type { JolpicaDriver, RaceWithResults } from '@/api/types';
import { Band, Page, SectionTitle } from '@/components/layout/Page';
import { FinishCell, isClassified } from '@/components/stats/FinishCell';
import { PointsChart } from '@/components/stats/PointsChart';
import { parseScope, ScopeToggle } from '@/components/stats/ScopeToggle';
import { DriverStatsGrid, StatsError, StatsLoading, TitleRuns } from '@/components/stats/StatPanels';
import { SecondaryButton } from '@/components/ui/Buttons';
import { ChampionChip } from '@/components/ui/ChampionChip';
import { CreditedImage } from '@/components/ui/CreditedImage';
import { HelmetText } from '@/components/ui/HelmetText';
import { EmptyState, ErrorState, errorMessage, PageLoading } from '@/components/ui/States';
import { actionPhoto } from '@/data/photos';
import { getDriverSeasonRaces, getDriverSeasonSprintRaces, getDriverStandings, getSchedule } from '@/data/repository';
import { useDriverStats } from '@/hooks/useStats';
import { isClinched, maxPointsLeft } from '@/logic/clinch';
import { driverPalette } from '@/logic/helmets';
import { driverSeasonNumbers, pointsByRound } from '@/logic/season';
import { teamBrand } from '@/logic/teamBrand';
import { useNow } from '@/hooks/useNow';

export default function DriverPage() {
  const params = useLocalSearchParams<{ id: string; scope?: string }>();
  const scope = parseScope(params.scope);
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const standings = useQuery({ queryKey: ['driverStandings'], queryFn: getDriverStandings });
  const races = useQuery({ queryKey: ['driverSeasonRaces', params.id], queryFn: () => getDriverSeasonRaces(params.id) });
  const sprints = useQuery({ queryKey: ['driverSprintRaces', params.id], queryFn: () => getDriverSeasonSprintRaces(params.id) });
  const stats = useDriverStats(params.id, scope);
  const now = useNow(60 * 60_000);
  const schedule = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });

  // The rival on the points chart: the champion or leader against second, everyone else against the leader.
  const standingIndex = standings.data?.findIndex((s) => s.Driver.driverId === params.id) ?? -1;
  const rival = standings.data?.[standingIndex === 0 ? 1 : 0];
  const rivalId = standingIndex >= 0 ? rival?.Driver.driverId : undefined;
  const rivalRaces = useQuery({ queryKey: ['driverSeasonRaces', rivalId], queryFn: () => getDriverSeasonRaces(rivalId!), enabled: !!rivalId });
  const rivalSprints = useQuery({ queryKey: ['driverSprintRaces', rivalId], queryFn: () => getDriverSeasonSprintRaces(rivalId!), enabled: !!rivalId });

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
  const color = teamBrand(team).color;
  const season = schedule.data?.[0]?.season ?? '';
  const champion =
    standing?.position === '1' && !!schedule.data && !!standings.data && isClinched(standings.data.map((s) => Number(s.points)), maxPointsLeft(schedule.data, 'drivers', now));
  const age = driver.dateOfBirth ? Math.floor((now - Date.parse(driver.dateOfBirth)) / (365.25 * 86_400_000)) : null;
  const numbers = driverSeasonNumbers(races.data ?? [], driver.driverId);
  const leaderPoints = Number(standings.data?.[0]?.points ?? 0);
  const gap = standing ? (standingIndex === 0 ? Number(standing.points) - Number(standings.data?.[1]?.points ?? 0) : Number(standing.points) - leaderPoints) : null;
  const photo = actionPhoto(driver.driverId);
  const headline = [
    standing ? { value: standing.points, label: 'points' } : null,
    standing ? { value: standing.wins, label: 'wins' } : null,
    { value: String(numbers.podiums), label: 'podiums' },
    { value: String(numbers.poles), label: 'poles' },
    { value: String(numbers.fastestLaps), label: 'fastest laps' },
    gap != null ? { value: gap > 0 ? `+${gap}` : String(gap), label: standingIndex === 0 ? 'clear of 2nd' : 'to the leader' } : null,
  ].filter((s): s is { value: string; label: string } => s != null);

  const mine = pointsByRound(races.data ?? [], sprints.data ?? [], (r) => r.Driver.driverId === driver.driverId);
  const theirs = rival && rivalRaces.data ? pointsByRound(rivalRaces.data, rivalSprints.data ?? [], (r) => r.Driver.driverId === rival.Driver.driverId) : null;

  return (
    <>
      <Head>
        <title>{`${name} · TrackiMetrix`}</title>
      </Head>

      <CreditedImage photo={photo} scrim={wide ? 'left' : 'phone'} eager tint={color} className="border-b border-line" >
        {/* The race number, outlined huge in the team colour: the one decorative flourish on the page. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: wide ? 40 : -6,
            ...(wide ? { bottom: -60 } : { top: 44 }),
            fontFamily: 'BarlowCondensed_700Bold',
            fontSize: wide ? 420 : 200,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: `2px ${color}8C`,
            pointerEvents: 'none',
          }}
        >
          {driver.permanentNumber ?? ''}
        </div>
        <View className="mx-auto w-full max-w-page px-4 pb-7 md:px-8 md:pb-14 xl:px-12 2xl:px-16" style={{ minHeight: wide ? 560 : 520, justifyContent: 'flex-end' }}>
          <View className="flex-row flex-wrap items-center gap-2.5">
            {champion ? <ChampionChip label={`${season} World Champion`} /> : standing ? (
              <View className="tm-slant bg-red px-3 py-0.5">
                <Text className="font-display text-[15px] uppercase tracking-[0.04em] text-white">P{standing.position ?? standing.positionText} in {season}</Text>
              </View>
            ) : null}
            <Text className="font-display-semi text-[15px] tracking-[0.04em] text-muted">
              {[team, driver.nationality, age ? `aged ${age}` : null].filter(Boolean).join(', ')}
            </Text>
          </View>
          <View className="mt-3.5">
            <HelmetText palette={driverPalette(driver.driverId, team)} size={wide ? 112 : 60} as="h1">
              {`${driver.givenName}\n${driver.familyName}`}
            </HelmetText>
          </View>
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

      {races.data?.length ? (
        <Band tone="surface" className="py-12 md:py-14">
          <SectionTitle aside={<Text className="font-body text-[14px] text-muted">Every Grand Prix, round 1 to {races.data.at(-1)?.round}</Text>}>Form guide</SectionTitle>
          <FormGuide races={races.data} driverId={driver.driverId} size={wide ? 50 : 30} />
        </Band>
      ) : null}

      <Page>
        <View className="gap-14 md:gap-16">

          {mine.length >= 2 ? (
            <View>
              <SectionTitle aside={<Text className="hidden font-body text-[14px] text-muted md:flex">Grand Prix and sprint points, by round</Text>}>The points race</SectionTitle>
              <PointsChart
                series={[
                  { label: driver.familyName, color, rounds: mine },
                  ...(theirs && rival ? [{ label: rival.Driver.familyName, color: rivalColor(color, teamBrand(rival.Constructors.at(-1)?.name).color), rounds: theirs }] : []),
                ]}
              />
            </View>
          ) : null}

          <View>
            <SectionTitle aside={<Text className="font-body text-[14px] text-muted">Newest first</Text>}>Race by race</SectionTitle>
            <SeasonRaces races={races.data ?? []} sprints={sprints.data ?? []} driverId={driver.driverId} columns={wide ? 2 : 1} />
          </View>

          <View className="gap-4 md:max-w-[560px]">
            <SectionTitle>In numbers</SectionTitle>
            <ScopeToggle scope={scope} />
            {stats.isPending ? (
              <StatsLoading scope={scope} />
            ) : stats.isError ? (
              <StatsError onRetry={() => stats.refetch()} />
            ) : (
              <View className="gap-6">
                <DriverStatsGrid stats={stats.data} />
                <TitleRuns runs={stats.data.titleRuns} />
              </View>
            )}
            <SecondaryButton href={`/standings?tab=drivers&id=${driver.driverId}&scope=${scope}`}>Back to standings</SecondaryButton>
          </View>
        </View>
      </Page>
    </>
  );
}

/** Two drivers from the same team share a colour; the rival's line then goes grey so both read. */
const rivalColor = (mine: string, theirs: string) => (mine.toLowerCase() === theirs.toLowerCase() ? '#8E949D' : theirs);

/** The season as a row of squares, one per Grand Prix: podiums in medal colours, retirements as R. */
function FormGuide({ races, driverId, size }: { races: RaceWithResults[]; driverId: string; size: number }) {
  return (
    <View className="flex-row flex-wrap gap-1 md:gap-1.5">
      {races.map((race) => {
        const r = race.Results?.find((x) => x.Driver.driverId === driverId);
        if (!r) return null;
        return (
          <View key={race.round} accessibilityLabel={`Round ${race.round}, ${race.raceName}: ${isClassified(r.positionText) ? `P${r.position}` : r.status}`}>
            <FinishCell position={r.position} classified={isClassified(r.positionText)} points={Number(r.points)} size={size} />
          </View>
        );
      })}
    </View>
  );
}

function SeasonRaces({ races, sprints, driverId, columns }: { races: RaceWithResults[]; sprints: RaceWithResults[]; driverId: string; columns: 1 | 2 }) {
  if (!races.length) return <EmptyState title="No races yet" detail="Results appear here after each round." />;
  const sprintByRound = new Map(sprints.map((s) => [s.round, s.SprintResults?.find((r) => r.Driver.driverId === driverId)]));
  const rows = [...races].reverse().flatMap((race) => {
    const result = race.Results?.find((r) => r.Driver.driverId === driverId);
    if (!result) return [];
    const classified = isClassified(result.positionText);
    const sprint = sprintByRound.get(race.round);
    const points = Number(result.points) + Number(sprint?.points ?? 0);
    return [
      <View key={race.round} className="flex-row items-center gap-3 border-b border-line py-2.5 md:gap-4">
        <Text className="w-6 font-display text-[16px] text-muted tnum">{race.round}</Text>
        <FinishCell position={result.position} classified={classified} points={points} size={columns === 2 ? 36 : 30} />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-body-semi text-[15px] text-paper">
            {race.raceName.replace(' Grand Prix', ' GP')}
          </Text>
          <Text numberOfLines={1} className="font-body text-[13px] text-muted">
            {result.grid === '0' ? 'From the pit lane' : `From P${result.grid}`}
            {sprint ? `, sprint P${sprint.position}` : ''}
            {classified ? '' : `, ${result.status}`}
            {result.FastestLap?.rank === '1' ? ', fastest lap' : ''}
          </Text>
        </View>
        <Text className="w-12 text-right font-display text-[18px] text-paper tnum">{points ? `+${points}` : '–'}</Text>
      </View>,
    ];
  });
  if (columns === 1) return <View>{rows}</View>;
  const half = Math.ceil(rows.length / 2);
  return (
    <View className="flex-row gap-16">
      <View className="flex-1">{rows.slice(0, half)}</View>
      <View className="flex-1">{rows.slice(half)}</View>
    </View>
  );
}
