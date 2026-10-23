import { useQuery } from '@tanstack/react-query';
import { CaretRight } from '@phosphor-icons/react/dist/csr/CaretRight';
import { Link } from 'expo-router';
import Head from 'expo-router/head';
import { Pressable, Text, View } from 'react-native';

import type { RaceSchedule } from '@/api/types';
import { Page, PageTitle } from '@/components/layout/Page';
import { ErrorState, errorMessage, PageLoading } from '@/components/ui/States';
import { getSchedule, getSeasonSessionTimeline, nextRace } from '@/data/repository';
import { formatDayMonth, formatViewerTime, formatViewerWeekday, raceStart, sessionStart, utcDay } from '@/domain/dates';
import { isSprintWeekend, weekendSessions } from '@/domain/weekend';
import { useNow } from '@/hooks/useNow';

export default function Calendar() {
  const schedule = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });
  // Only used to turn a finished round into a link; the calendar stands without it.
  const timeline = useQuery({ queryKey: ['timeline'], queryFn: getSeasonSessionTimeline });
  const now = useNow();

  if (schedule.isPending) return <PageLoading />;
  if (schedule.isError) {
    return (
      <Page>
        <ErrorState title="The calendar didn’t load" detail={errorMessage(schedule.error)} onRetry={() => schedule.refetch()} />
      </Page>
    );
  }

  const races = schedule.data;
  const next = nextRace(races, now);
  const raceSessionByDay = new Map(
    (timeline.data ?? []).filter((s) => s.session_name === 'Race').map((s) => [utcDay(sessionStart(s) ?? 0), s.session_key]),
  );
  const finished = races.filter((r) => (raceStart(r) ?? Infinity) < now);
  const upcoming = races.filter((r) => (raceStart(r) ?? 0) >= now);
  const [featured, ...later] = upcoming;

  return (
    <Page>
      <Head>
        <title>Calendar · TrackiMetrix</title>
      </Head>
      <PageTitle title="Calendar" kicker={`${races[0]?.season ?? ''} season, ${finished.length} of ${races.length} rounds run`} />
      <SeasonStrip races={races} next={next} now={now} />

      {featured ? (
        <View className="mt-10 gap-4">
          <FeaturedRound race={featured} now={now} />
          {later.length ? (
            <View className="flex-row flex-wrap gap-3">
              {later.map((race) => (
                <UpcomingCard key={race.round} race={race} now={now} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {finished.length ? (
        <View className="mt-14 gap-3">
          <Text accessibilityRole="header" className="font-display text-[26px] text-white">
            Already run
          </Text>
          <View className="flex-row flex-wrap gap-x-6">
            {[...finished].reverse().map((race) => (
              <FinishedRow key={race.round} race={race} sessionKey={raceSessionByDay.get(race.date)} />
            ))}
          </View>
        </View>
      ) : null}
    </Page>
  );
}

/** The season at a glance: one segment per round, run ones filled, the next one lit. */
function SeasonStrip({ races, next, now }: { races: RaceSchedule[]; next: RaceSchedule | null; now: number }) {
  return (
    <View accessibilityLabel="Season progress" className="flex-row gap-1">
      {races.map((race) => {
        const done = (raceStart(race) ?? Infinity) < now;
        const isNext = race === next && !done;
        return (
          <View
            key={race.round}
            accessibilityLabel={`Round ${race.round}, ${race.raceName}`}
            className={`h-2 flex-1 rounded-full ${isNext ? 'bg-red' : done ? 'bg-white/45' : 'bg-line/70'}`}
          />
        );
      })}
    </View>
  );
}

const dateRange = (race: RaceSchedule) => {
  const first = weekendSessions(race)[0];
  return first?.start ? `${formatDayMonth(new Date(first.start).toISOString().slice(0, 10))} to ${formatDayMonth(race.date)}` : formatDayMonth(race.date);
};

function FeaturedRound({ race, now }: { race: RaceSchedule; now: number }) {
  const sessions = weekendSessions(race);
  const start = raceStart(race);
  const days = start ? Math.max(0, Math.ceil((start - now) / 86_400_000)) : null;
  return (
    <View className="gap-5 rounded-card border border-red/60 bg-red/[0.07] p-5 md:flex-row md:items-center md:p-7">
      <View className="gap-1 md:flex-1">
        <Text className="font-body-semi text-[15px] text-amber">
          Up next{days != null ? `, ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}` : ''}
        </Text>
        <Text className="font-display text-[40px] leading-[42px] text-white">
          <Text className="text-red tnum">{race.round.padStart(2, '0')} </Text>
          {race.raceName}
        </Text>
        <Text className="font-body text-[16px] text-muted">
          {race.Circuit.circuitName}, {race.Circuit.Location.country}. {dateRange(race)}
          {isSprintWeekend(race) ? '. Sprint weekend' : ''}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-x-5 gap-y-2 md:w-[46%]">
        {sessions.map((s) => (
          <View key={s.name} className="min-w-[120px] gap-0.5">
            <Text className={`font-body-semi text-[14px] ${s.name === 'Race' ? 'text-white' : 'text-muted'}`}>{s.name}</Text>
            <Text className="font-body text-[14px] text-white tnum">
              {s.start ? `${formatViewerWeekday(s.start)} ${s.hasTime ? formatViewerTime(s.start) : ''}` : 'To be confirmed'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function UpcomingCard({ race, now }: { race: RaceSchedule; now: number }) {
  const start = raceStart(race);
  return (
    <View className="w-full gap-2 rounded-card border border-line bg-surface p-4 sm:w-[calc(50%-6px)] lg:w-[calc(33.33%-8px)]">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-display text-[26px] leading-[28px] text-muted tnum">{race.round.padStart(2, '0')}</Text>
        {isSprintWeekend(race) ? <Text className="font-body-semi text-[13px] text-muted">Sprint weekend</Text> : null}
      </View>
      <Text className="font-display text-[22px] leading-[24px] text-white">{race.raceName.replace(' Grand Prix', ' GP')}</Text>
      <Text className="font-body text-[14px] text-muted">
        {race.Circuit.Location.locality}, {race.Circuit.Location.country}
      </Text>
      <Text className="font-body-semi text-[14px] text-white tnum">
        {dateRange(race)}
        {start && race.time && start > now ? <Text className="font-body text-muted">{`, race ${formatViewerTime(start)}`}</Text> : null}
      </Text>
    </View>
  );
}

function FinishedRow({ race, sessionKey }: { race: RaceSchedule; sessionKey?: number }) {
  const body = (
    <View className={`flex-row items-center gap-4 border-b border-line/50 py-3 ${sessionKey ? 'group' : ''}`}>
      <Text className="w-8 font-display text-[18px] text-muted tnum">{race.round.padStart(2, '0')}</Text>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-body-semi text-[16px] text-white group-hover:text-red">
          {race.raceName}
        </Text>
        <Text className="font-body text-[14px] text-muted">{formatDayMonth(race.date)}</Text>
      </View>
      {sessionKey ? <CaretRight size={18} color="#9A9AA2" /> : null}
    </View>
  );
  return (
    <View className="w-full md:w-[calc(50%-12px)]">
      {sessionKey ? (
        <Link href={`/results/${sessionKey}`} asChild>
          <Pressable accessibilityLabel={`${race.raceName} results`}>{body}</Pressable>
        </Link>
      ) : (
        body
      )}
    </View>
  );
}
