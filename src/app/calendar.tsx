import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import Head from 'expo-router/head';
import { Pressable, Text, View } from 'react-native';

import type { RaceSchedule } from '@/api/types';
import { Page, PageTitle, SectionTitle } from '@/components/layout/Page';
import { CreditedImage, PhotoCredit } from '@/components/ui/CreditedImage';
import { ErrorState, errorMessage, PageLoading } from '@/components/ui/States';
import { circuitPhoto } from '@/data/photos';
import { getSchedule, getSeasonSessionTimeline, getSeasonWinners, nextRace, type RoundWinner } from '@/data/repository';
import { formatDayMonth, formatViewerTime, formatViewerWeekday, raceStart, sessionStart, utcDay, viewerTimeZoneName } from '@/domain/dates';
import { teamBrand } from '@/domain/teamBrand';
import { isSprintWeekend, weekendSessions } from '@/domain/weekend';
import { useNow } from '@/hooks/useNow';

export default function Calendar() {
  const schedule = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });
  // Both are extras on top of the schedule: winners colour the strip, the timeline links to results.
  const winners = useQuery({ queryKey: ['seasonWinners'], queryFn: getSeasonWinners });
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
  const winnerByRound = new Map((winners.data ?? []).map((w) => [w.round, w]));
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
      <PageTitle
        title="Calendar"
        kicker={`${races[0]?.season ?? ''} season. ${finished.length} of ${races.length} rounds run. Times are in your timezone (${viewerTimeZoneName()}).`}
      />
      <SeasonStrip races={races} next={next} now={now} winners={winnerByRound} />

      {featured ? (
        <View className="mt-14 md:mt-[72px]">
          <SectionTitle aside={<Text className="font-body text-[14px] text-muted">{upcoming.length} {upcoming.length === 1 ? 'round' : 'rounds'}</Text>}>Still to come</SectionTitle>
          <View className="gap-3 lg:flex-row">
            <View className="lg:flex-[2]">
              <FeaturedRound race={featured} now={now} />
            </View>
            {later.length ? (
              <View className="gap-3 lg:flex-1">
                {later.map((race) => (
                  <UpcomingCard key={race.round} race={race} />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {finished.length ? (
        <View className="mt-14 md:mt-[72px]">
          <SectionTitle aside={<Text className="font-body text-[14px] text-muted">Newest first</Text>}>Already run</SectionTitle>
          <View className="hidden flex-row gap-5 border-b border-strong px-4 pb-2.5 md:flex">
            {[
              ['Rd', 'w-8'],
              ['Race day', 'w-[120px]'],
              ['Grand Prix', 'flex-1'],
              ['Winner', 'w-[224px] pl-4'],
              ['Team', 'w-[140px]'],
              ['', 'w-[90px]'],
            ].map(([label, w]) => (
              <Text key={label || 'link'} className={`font-display-semi text-[15px] tracking-[0.04em] text-muted ${w}`}>
                {label}
              </Text>
            ))}
          </View>
          {[...finished].reverse().map((race) => (
            <FinishedRow key={race.round} race={race} winner={winnerByRound.get(race.round)} sessionKey={raceSessionByDay.get(race.date)} />
          ))}
        </View>
      ) : null}
    </Page>
  );
}

/**
 * The season at a glance: one cell per round. Run rounds show who won, in their team's colour, so
 * the season's story (who dominated, who came on late) reads left to right. The next round is red.
 */
function SeasonStrip({ races, next, now, winners }: { races: RaceSchedule[]; next: RaceSchedule | null; now: number; winners: Map<string, RoundWinner> }) {
  return (
    <View>
      <View accessibilityLabel="Season so far" className="flex-row flex-wrap gap-1 md:flex-nowrap md:gap-1.5">
        {races.map((race) => {
          const done = (raceStart(race) ?? Infinity) < now;
          const isNext = race === next && !done;
          const w = winners.get(race.round);
          const color = w ? teamBrand(w.team).color : undefined;
          return (
            <View
              key={race.round}
              accessibilityLabel={`Round ${race.round}, ${race.raceName}${w ? `, won by ${w.name}` : isNext ? ', next' : ''}`}
              className={`h-[60px] w-10 items-center justify-between py-1.5 md:h-[72px] md:w-auto md:flex-1 ${
                isNext ? 'border-2 border-red' : w ? '' : 'border border-line'
              }`}
              style={w && color ? { backgroundColor: `${color}26`, borderBottomWidth: 4, borderBottomColor: color } : undefined}
            >
              <Text className="font-display text-[13px] text-muted tnum">{race.round}</Text>
              <Text className={`font-display text-[15px] md:text-[18px] ${isNext ? 'text-red' : w ? 'text-paper' : 'text-muted'}`}>
                {w ? w.code : isNext ? 'NEXT' : done ? '?' : '–'}
              </Text>
            </View>
          );
        })}
      </View>
      <Text className="mt-3 font-body text-[14px] text-muted">Each run round shows its winner, coloured by their team.</Text>
    </View>
  );
}

const dateRange = (race: RaceSchedule) => {
  const first = weekendSessions(race)[0];
  return first?.start ? `${formatViewerWeekday(first.start)} ${formatDayMonth(new Date(first.start).toISOString().slice(0, 10))} to ${formatDayMonth(race.date)}` : formatDayMonth(race.date);
};

function FeaturedRound({ race, now }: { race: RaceSchedule; now: number }) {
  const sessions = weekendSessions(race);
  const start = raceStart(race);
  const days = start ? Math.max(0, Math.ceil((start - now) / 86_400_000)) : null;
  const photo = circuitPhoto(race.Circuit.circuitId);
  return (
    <CreditedImage photo={photo} scrim="heavy" creditPosition="none" eager className="h-full border border-red">
      <View className="p-6 md:p-7">
        <View className="flex-row items-start justify-between">
          <Text className="font-display-semi text-[15px] tracking-[0.04em] text-paper">
            Round {race.round}
            {isSprintWeekend(race) ? ', sprint weekend' : ''}
          </Text>
          {days != null ? <Text className="font-display text-[16px] text-red">{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}</Text> : null}
        </View>
        <Text className="mt-3 font-title text-[34px] uppercase leading-[32px] text-paper md:text-[56px] md:leading-[52px]">
          {race.raceName.replace(' Grand Prix', '\nGrand Prix')}
        </Text>
        <Text className="mt-2 font-body text-[15px] text-muted">
          {race.Circuit.circuitName}, {race.Circuit.Location.country}
        </Text>
        <View className="mt-5 max-w-[440px]">
          {sessions.map((s) => (
            <View key={s.name} className="flex-row justify-between border-t border-paper/10 py-[7px]">
              <Text className="font-body text-[15px] text-paper">{s.name}</Text>
              <Text className="font-display text-[17px] text-paper tnum">
                {s.start ? `${formatViewerWeekday(s.start)} ${formatDayMonth(new Date(s.start).toISOString().slice(0, 10))}${s.hasTime ? `, ${formatViewerTime(s.start)}` : ''}` : 'To be confirmed'}
              </Text>
            </View>
          ))}
        </View>
        <PhotoCredit photo={photo} />
      </View>
    </CreditedImage>
  );
}

function UpcomingCard({ race }: { race: RaceSchedule }) {
  const start = raceStart(race);
  const photo = circuitPhoto(race.Circuit.circuitId);
  return (
    <CreditedImage photo={photo} scrim="bottom" creditPosition="none" className="border border-line lg:flex-1">
      <View className={`p-[22px] ${photo ? 'pt-[110px] lg:pt-[22px]' : ''}`}>
        <View className="flex-row items-start justify-between">
          <Text className="font-display-semi text-[15px] tracking-[0.04em] text-muted">
            Round {race.round}
            {isSprintWeekend(race) ? ', sprint' : ''}
          </Text>
          <Text className="font-display text-[16px] text-muted">{dateRange(race)}</Text>
        </View>
        <Text className="mt-3 font-title text-[34px] uppercase leading-[32px] text-paper">{race.raceName}</Text>
        <Text className="mt-2 font-body text-[15px] text-muted">
          {race.Circuit.circuitName}, {race.Circuit.Location.country}
        </Text>
        {start ? (
          <Text className="mt-[18px] font-display text-[20px] text-paper">
            Lights out {formatViewerWeekday(start)} {formatDayMonth(race.date)}
            {race.time ? `, ${formatViewerTime(start)}` : ''}
          </Text>
        ) : null}
        <PhotoCredit photo={photo} />
      </View>
    </CreditedImage>
  );
}

function FinishedRow({ race, winner, sessionKey }: { race: RaceSchedule; winner?: RoundWinner; sessionKey?: number }) {
  const color = winner ? teamBrand(winner.team).color : '#3A404A';
  const body = (
    <View className="flex-row items-center gap-3 border-b border-line py-3 transition-colors hover:bg-lifted md:gap-5 md:px-4">
      <Text className="w-6 font-display text-[17px] text-muted tnum md:w-8 md:text-[20px]">{race.round}</Text>
      <Text className="hidden w-[120px] font-body text-[15px] text-muted md:flex">{formatDayMonth(race.date)}</Text>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-body-semi text-[15px] text-paper md:text-[16px]">
          <Text className="md:hidden">{race.raceName.replace(' Grand Prix', '')}</Text>
          <Text className="hidden md:flex">{race.raceName}</Text>
          <Text className="hidden font-body text-muted md:flex">{`  ${race.Circuit.Location.locality}`}</Text>
        </Text>
        <Text className="font-body text-[13px] text-muted md:hidden">{formatDayMonth(race.date)}</Text>
      </View>
      <View className="h-7 w-1" style={{ backgroundColor: color }} />
      <Text numberOfLines={2} className="w-[104px] font-body text-[14px] text-paper md:w-[220px] md:text-[16px]">
        {winner?.name ?? '–'}
      </Text>
      <Text numberOfLines={1} className="hidden w-[140px] font-body text-[15px] text-muted md:flex">
        {winner?.team ?? ''}
      </Text>
      <Text className="hidden w-[90px] text-right font-display text-[16px] text-muted md:flex">{sessionKey ? 'Results ›' : ''}</Text>
    </View>
  );
  return sessionKey ? (
    <Link href={`/results/${sessionKey}`} asChild>
      <Pressable accessibilityLabel={`${race.raceName} results`}>{body}</Pressable>
    </Link>
  ) : (
    body
  );
}
