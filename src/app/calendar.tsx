import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import Head from 'expo-router/head';
import { Pressable, Text, View } from 'react-native';

import type { RaceSchedule } from '@/api/types';
import { Page, PageTitle } from '@/components/layout/Page';
import { ErrorState, errorMessage, PageLoading } from '@/components/ui/States';
import { getSchedule, getSeasonSessionTimeline, nextRace } from '@/data/repository';
import { formatDayMonth, formatViewerTime, raceStart, sessionStart, utcDay } from '@/domain/dates';
import { isSprintWeekend, weekendSessions } from '@/domain/weekend';

export default function Calendar() {
  const schedule = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });
  // Only used to turn a finished round into a link; the calendar stands without it.
  const timeline = useQuery({ queryKey: ['timeline'], queryFn: getSeasonSessionTimeline });

  if (schedule.isPending) return <PageLoading />;
  if (schedule.isError) {
    return (
      <Page>
        <ErrorState title="The calendar didn't load" detail={errorMessage(schedule.error)} onRetry={() => schedule.refetch()} />
      </Page>
    );
  }

  const races = schedule.data;
  const next = nextRace(races);
  const raceSessionByDay = new Map(
    (timeline.data ?? [])
      .filter((s) => s.session_type === 'Race' && s.session_name === 'Race')
      .map((s) => [utcDay(sessionStart(s) ?? 0), s.session_key]),
  );
  const done = races.filter((r) => (raceStart(r) ?? Infinity) < Date.now()).length;

  return (
    <Page>
      <Head>
        <title>Calendar · TrackiMetrix</title>
      </Head>
      <PageTitle title="Calendar" kicker={`${races[0]?.season ?? ''} season`}>
        <Text className="font-body text-[15px] text-muted">
          {done} of {races.length} rounds run
        </Text>
      </PageTitle>
      <View className="flex-row flex-wrap gap-3">
        {races.map((race) => (
          <RoundCard
            key={race.round}
            race={race}
            isNext={race === next && (raceStart(race) ?? 0) > Date.now()}
            sessionKey={raceSessionByDay.get(race.date)}
          />
        ))}
      </View>
    </Page>
  );
}

function RoundCard({ race, isNext, sessionKey }: { race: RaceSchedule; isNext: boolean; sessionKey?: number }) {
  const start = raceStart(race);
  const finished = start != null && start < Date.now();
  const first = weekendSessions(race)[0];
  const range = first?.start ? `${formatDayMonth(new Date(first.start).toISOString().slice(0, 10))} – ${formatDayMonth(race.date)}` : formatDayMonth(race.date);

  const body = (
    <View
      className={`h-full gap-3 rounded-card border p-4 transition-colors ${
        isNext ? 'border-red bg-red/10' : finished ? 'border-line/60 bg-transparent' : 'border-line bg-surface'
      } ${sessionKey ? 'hover:border-muted' : ''}`}
    >
      <View className="flex-row items-center justify-between">
        <Text className={`font-display text-[34px] leading-[34px] tnum ${finished ? 'text-line' : isNext ? 'text-red' : 'text-muted'}`}>
          {race.round.padStart(2, '0')}
        </Text>
        {isNext ? (
          <Text className="font-body-semi text-[14px] text-amber">Up next</Text>
        ) : isSprintWeekend(race) ? (
          <Text className="font-body-semi text-[14px] text-muted">Sprint weekend</Text>
        ) : null}
      </View>
      <View className="gap-0.5">
        <Text className={`font-display text-[22px] leading-[24px] ${finished ? 'text-muted' : 'text-white'}`}>{race.raceName.replace(' Grand Prix', ' GP')}</Text>
        <Text className="font-body text-[14px] text-muted">
          {race.Circuit.Location.locality}, {race.Circuit.Location.country}
        </Text>
      </View>
      <Text className="font-body-semi text-[14px] text-white">
        {range}
        {!finished && start && race.time ? <Text className="font-body text-muted">{`, race ${formatViewerTime(start)}`}</Text> : null}
      </Text>
      {sessionKey ? <Text className="font-body-semi text-[14px] text-red">Results and replay</Text> : null}
    </View>
  );

  return (
    <View className="w-full sm:w-[calc(50%-6px)] lg:w-[calc(25%-9px)]">
      {sessionKey ? (
        <Link href={`/results/${sessionKey}`} asChild>
          <Pressable className="h-full">{body}</Pressable>
        </Link>
      ) : (
        body
      )}
    </View>
  );
}
