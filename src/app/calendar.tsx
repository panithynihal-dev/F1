import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import Head from 'expo-router/head';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import type { RaceSchedule } from '@/api/types';
import { Band, Page, PageTitle, SectionTitle } from '@/components/layout/Page';
import { CreditedImage, PhotoCredit } from '@/components/ui/CreditedImage';
import { DriverName, ScriptName } from '@/components/ui/DriverName';
import { ErrorState, errorMessage, PageLoading } from '@/components/ui/States';
import { circuitPhoto } from '@/data/photos';
import { getSchedule, getSeasonSessionTimeline, getSeasonWinners, nextRace, type RoundWinner } from '@/data/repository';
import { formatDayMonth, formatViewerTime, formatViewerWeekday, raceStart, sessionStart, utcDay, viewerTimeZoneName } from '@/logic/dates';
import { flagPalette, raceTitleParts } from '@/logic/flags';
import { teamBrand } from '@/logic/teamBrand';
import { isSprintWeekend, weekendSessions } from '@/logic/weekend';
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
    <>
      <Page
        header={
          <View className="gap-7">
            <PageTitle
              title="Calendar"
              kicker={`${races[0]?.season ?? ''} season. ${finished.length} of ${races.length} rounds run. Times are in your timezone (${viewerTimeZoneName()}).`}
            />
            <SeasonStrip races={races} next={next} now={now} winners={winnerByRound} />
          </View>
        }
      >
        <Head>
          <title>Calendar · TrackiMetrix</title>
        </Head>

        {featured ? (
          <View>
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
      </Page>

        {finished.length ? (
          <Band tone="surface" className="pb-14 pt-12 md:pb-16 md:pt-14">
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
          </Band>
        ) : null}
    </>
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

/** The race name, F1 style, in the host country's flag colours held still (no motion on this page). */
function RaceName({ race, maxSize }: { race: RaceSchedule; maxSize: number }) {
  const palette = flagPalette(race.Circuit.Location.country);
  const { script, wide } = raceTitleParts(race.raceName);
  return wide ? (
    <DriverName given={script} family={wide} palette={palette} maxSize={maxSize} still />
  ) : (
    <ScriptName text={script} palette={palette} maxSize={Math.round(maxSize * 1.6)} as="h3" still />
  );
}

function FeaturedRound({ race, now }: { race: RaceSchedule; now: number }) {
  const phone = useWindowDimensions().width < 768;
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
        <View className="mt-3 max-w-[640px]">
          <RaceName race={race} maxSize={phone ? 34 : 56} />
        </View>
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
        <View className="mt-3">
          <RaceName race={race} maxSize={34} />
        </View>
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
