import { useQuery } from '@tanstack/react-query';
import Head from 'expo-router/head';
import { Text, View } from 'react-native';

import type { ConstructorStanding, RaceSchedule } from '@/api/types';
import { CircuitVisual } from '@/components/home/CircuitVisual';
import { Countdown } from '@/components/home/Countdown';
import { Podium } from '@/components/home/Podium';
import { TitleFight } from '@/components/home/TitleFight';
import { WeekendTimeline } from '@/components/home/WeekendTimeline';
import { Page } from '@/components/layout/Page';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { ErrorState, errorMessage, PageLoading } from '@/components/ui/States';
import { getConstructorStandings, getDriverStandings, getLastRaceResults, getMeetingForDate, getSchedule, nextRace } from '@/data/repository';
import { formatCircuitTime, formatRaceDate, formatViewerTime, raceStart, viewerTimeZoneName } from '@/domain/dates';
import { isSprintWeekend } from '@/domain/weekend';
import { useNow } from '@/hooks/useNow';

export default function Home() {
  const schedule = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });
  // Ticks each minute, so the hero rolls on to the next round once a race starts.
  const now = useNow();
  const race = schedule.data ? nextRace(schedule.data, now) : null;
  // Everything below the headline is best-effort: losing the standings or the artwork shouldn't
  // take the whole page down with it.
  const meeting = useQuery({ queryKey: ['meeting', race?.date], queryFn: () => getMeetingForDate(race!.date), enabled: !!race });
  const drivers = useQuery({ queryKey: ['driverStandings'], queryFn: getDriverStandings });
  const constructors = useQuery({ queryKey: ['constructorStandings'], queryFn: getConstructorStandings });
  const lastRace = useQuery({ queryKey: ['lastRace'], queryFn: getLastRaceResults });

  if (schedule.isPending) return <PageLoading />;
  if (schedule.isError) {
    return (
      <Page>
        <ErrorState title="The calendar didn’t load" detail={errorMessage(schedule.error)} onRetry={() => schedule.refetch()} />
      </Page>
    );
  }

  const remaining = schedule.data.filter((r) => (raceStart(r) ?? 0) > now);
  const roundsLeft = remaining.length;
  // 25 for a Grand Prix win, 8 for a sprint win: the most one driver can still add.
  const pointsLeft = roundsLeft * 25 + remaining.filter(isSprintWeekend).length * 8;
  return (
    <>
      <Head>
        <title>{race ? `${race.raceName} · TrackiMetrix` : 'TrackiMetrix'}</title>
      </Head>
      {race ? (
        <Hero race={race} circuitKey={meeting.data?.circuit_key} circuitImage={meeting.data?.circuit_image} gmtOffset={meeting.data?.gmt_offset} now={now} />
      ) : null}

      <Page>
        <View className="gap-14 md:gap-20">
          {race ? <WeekendTimeline race={race} now={now} /> : null}

          <View className="gap-12 lg:flex-row lg:gap-16">
            {lastRace.data ? (
              <View className="gap-5 lg:w-[44%]">
                <View className="gap-1">
                  <Text accessibilityRole="header" className="font-display text-[26px] text-white">
                    {lastRace.data.raceName}
                  </Text>
                  <Text className="font-body text-[15px] text-muted">Round {lastRace.data.round} podium</Text>
                </View>
                <Podium podium={lastRace.data.podium} />
                <SecondaryButton href="/results">Full results</SecondaryButton>
              </View>
            ) : null}

            {drivers.data?.length ? (
              <View className="gap-5 lg:flex-1">
                <View className="gap-1">
                  <Text accessibilityRole="header" className="font-display text-[26px] text-white">
                    The title fight
                  </Text>
                  <Text className="font-body text-[15px] text-muted">
                    {roundsLeft ? `${roundsLeft} ${roundsLeft === 1 ? 'round' : 'rounds'} left, up to ${pointsLeft} points still to win` : 'Season complete'}
                  </Text>
                </View>
                <TitleFight standings={drivers.data} />
                {constructors.data?.length ? <ConstructorsStrip standings={constructors.data} /> : null}
                <SecondaryButton href="/standings">Full standings</SecondaryButton>
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </>
  );
}

function Hero({
  race,
  circuitKey,
  circuitImage,
  gmtOffset,
  now,
}: {
  race: RaceSchedule;
  circuitKey?: number | null;
  circuitImage?: string | null;
  gmtOffset?: string | null;
  now: number;
}) {
  const start = raceStart(race);
  const started = start != null && start < now;
  const circuitTime = formatCircuitTime(race, gmtOffset);
  return (
    <View className="relative overflow-hidden border-b border-line/60">
      <View className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 0% 0%, rgba(225,6,0,0.22), transparent 60%)' } as object} />
      <View className="mx-auto w-full max-w-page gap-6 px-4 pb-10 pt-8 md:flex-row md:items-center md:px-8 md:pb-14 md:pt-12">
        <View className="z-10 gap-5 md:w-[52%]">
          <View className="flex-row items-center gap-3">
            <View className="rounded-badge bg-red px-2 py-0.5">
              <Text className="font-body-bold text-[13px] text-white">Round {race.round}</Text>
            </View>
            <Text className="font-body-semi text-[15px] text-amber">{started ? 'Racing now' : 'Up next'}</Text>
          </View>
          <View className="gap-2">
            <Text accessibilityRole="header" className="font-display text-[44px] leading-[44px] text-white md:text-[58px] md:leading-[58px]">
              {race.raceName}
            </Text>
            <Text className="font-body text-[17px] text-muted">
              {race.Circuit.circuitName}, {race.Circuit.Location.locality}
            </Text>
          </View>
          {start != null && !started ? (
            <View className="gap-2.5">
              <Countdown to={start} />
              <Text className="font-body text-[15px] text-muted">
                {formatRaceDate(race)}
                {race.time ? `, ${formatViewerTime(start)} your time (${viewerTimeZoneName()})` : ''}
                {circuitTime ? `, ${circuitTime} local` : ''}
              </Text>
            </View>
          ) : (
            <Text className="font-body text-[16px] text-muted">{formatRaceDate(race)}</Text>
          )}
          <View className="flex-row flex-wrap gap-3">
            <PrimaryButton href="/results">Latest results</PrimaryButton>
            <SecondaryButton href="/calendar">Calendar</SecondaryButton>
          </View>
        </View>
        <View className="h-[240px] md:h-[420px] md:flex-1">
          <CircuitVisual circuitKey={circuitKey} imageUrl={circuitImage} label={`${race.Circuit.circuitName} layout`} />
        </View>
      </View>
    </View>
  );
}

/** The constructors' top three in one line: the other championship, kept in view without a second chart. */
function ConstructorsStrip({ standings }: { standings: ConstructorStanding[] }) {
  return (
    <View className="flex-row flex-wrap gap-2 border-t border-line/60 pt-4">
      <Text className="w-full font-body-semi text-[14px] text-muted">Constructors</Text>
      {standings.slice(0, 3).map((s) => (
        <View key={s.Constructor.constructorId} className="flex-row items-center gap-2 rounded-full border border-line px-3 py-1.5">
          <Text className="font-display text-[15px] text-muted tnum">{s.position ?? s.positionText}</Text>
          <TeamBadge teamName={s.Constructor.name} />
          <Text className="font-body-semi text-[14px] text-white tnum">{s.points}</Text>
        </View>
      ))}
    </View>
  );
}
