import { useQuery } from '@tanstack/react-query';
import Head from 'expo-router/head';
import { Text, View } from 'react-native';

import type { DriverStanding, RaceSchedule } from '@/api/types';
import { CircuitHero } from '@/components/home/CircuitHero';
import { Countdown } from '@/components/home/Countdown';
import { Card, Page, SectionTitle } from '@/components/layout/Page';
import { StandingRow } from '@/components/StandingRow';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import { DriverNumberTile } from '@/components/ui/DriverNumberTile';
import { ErrorState, errorMessage, PageLoading } from '@/components/ui/States';
import { getDriverStandings, getLastRaceResults, getMeetingForDate, getSchedule, nextRace } from '@/data/repository';
import { formatCircuitTime, formatRaceDate, formatViewerTime, formatViewerWeekday, raceStart, viewerTimeZoneName } from '@/domain/dates';
import { weekendSessions } from '@/domain/weekend';

export default function Home() {
  const schedule = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });
  const race = schedule.data ? nextRace(schedule.data) : null;
  // Everything below the headline is best-effort: losing the standings or the artwork shouldn't
  // take the whole page down with it.
  const meeting = useQuery({ queryKey: ['meeting', race?.date], queryFn: () => getMeetingForDate(race!.date), enabled: !!race });
  const standings = useQuery({ queryKey: ['driverStandings'], queryFn: getDriverStandings });
  const lastRace = useQuery({ queryKey: ['lastRace'], queryFn: getLastRaceResults });

  if (schedule.isPending) return <PageLoading />;
  if (schedule.isError) {
    return (
      <Page>
        <ErrorState title="The calendar didn't load" detail={errorMessage(schedule.error)} onRetry={() => schedule.refetch()} />
      </Page>
    );
  }

  return (
    <>
      <Head>
        <title>{race ? `${race.raceName} · TrackiMetrix` : 'TrackiMetrix'}</title>
      </Head>
      {race ? <Hero race={race} circuitImage={meeting.data?.circuit_image} gmtOffset={meeting.data?.gmt_offset} /> : null}
      <Page>
        <View className="gap-10 md:flex-row md:gap-8">
          <View className="gap-10 md:flex-1">
            {race ? <WeekendCard race={race} /> : null}
            {lastRace.data ? (
              <View>
                <SectionTitle aside={<Text className="font-body text-[14px] text-muted">Round {lastRace.data.round}</Text>}>
                  {`${lastRace.data.raceName} result`}
                </SectionTitle>
                <Card className="overflow-hidden">
                  {lastRace.data.podium.map((result) => (
                    <StandingRow
                      key={result.Driver.driverId}
                      position={result.position}
                      teamName={result.Constructor.name}
                      name={`${result.Driver.givenName} ${result.Driver.familyName}`}
                      detail={result.Constructor.name}
                      figure={result.Time?.time}
                      href={`/drivers/${result.Driver.driverId}`}
                    />
                  ))}
                </Card>
              </View>
            ) : null}
          </View>
          <View className="md:w-[420px]">{standings.data?.length ? <Championship standings={standings.data} /> : null}</View>
        </View>
      </Page>
    </>
  );
}

function Hero({ race, circuitImage, gmtOffset }: { race: RaceSchedule; circuitImage?: string | null; gmtOffset?: string | null }) {
  const start = raceStart(race);
  const started = start != null && start < Date.now();
  const circuitTime = formatCircuitTime(race, gmtOffset);
  return (
    <View className="relative overflow-hidden border-b border-line/60">
      {/* The red bloom from the app's hero, anchored where the eye starts reading. */}
      <View className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 0% 0%, rgba(225,6,0,0.22), transparent 60%)' } as object} />
      <View className="mx-auto w-full max-w-page gap-8 px-4 pb-10 pt-8 md:flex-row md:items-center md:px-8 md:pb-16 md:pt-14">
        <View className="z-10 gap-5 md:flex-1">
          <View className="flex-row items-center gap-3">
            <View className="rounded-badge bg-red px-2 py-0.5">
              <Text className="font-body-bold text-[13px] text-white">Round {race.round}</Text>
            </View>
            <Text className="font-body-semi text-[15px] text-amber">{started ? 'Latest round' : 'Up next'}</Text>
          </View>
          <View className="gap-2">
            <Text accessibilityRole="header" className="font-display text-[48px] leading-[48px] text-white md:text-[72px] md:leading-[70px]">
              {race.raceName}
            </Text>
            <Text className="font-body text-[17px] text-muted">
              {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
            </Text>
          </View>
          {start != null && !started ? (
            <View className="gap-3">
              <Countdown to={start} />
              <Text className="font-body text-[15px] text-muted">
                {formatRaceDate(race)}
                {race.time ? `, lights out ${formatViewerTime(start)} your time (${viewerTimeZoneName()})` : ''}
                {circuitTime ? `, ${circuitTime} at the circuit` : ''}
              </Text>
            </View>
          ) : (
            <Text className="font-body text-[16px] text-muted">{formatRaceDate(race)}</Text>
          )}
          <View className="flex-row flex-wrap gap-3">
            <PrimaryButton href="/results">See latest results</PrimaryButton>
            <SecondaryButton href="/calendar">Full calendar</SecondaryButton>
          </View>
        </View>
        <View className="h-[180px] md:h-[380px] md:flex-1">
          {circuitImage ? <CircuitHero imageUrl={circuitImage} label={`${race.Circuit.circuitName} layout`} /> : null}
        </View>
      </View>
    </View>
  );
}

/** The weekend's sessions in the visitor's own time — the thing the app never showed. */
function WeekendCard({ race }: { race: RaceSchedule }) {
  const sessions = weekendSessions(race);
  const now = Date.now();
  const nextIndex = sessions.findIndex((s) => (s.start ?? 0) > now);
  return (
    <View>
      <SectionTitle aside={<Text className="font-body text-[14px] text-muted">Your time, {viewerTimeZoneName()}</Text>}>Race weekend</SectionTitle>
      <Card className="overflow-hidden">
        {sessions.map((session, i) => {
          const done = session.start != null && session.start < now && i !== nextIndex;
          const isNext = i === nextIndex;
          return (
            <View key={session.name} className={`flex-row items-center gap-4 border-line/60 px-4 py-3 ${i ? 'border-t' : ''} ${isNext ? 'bg-lifted' : ''}`}>
              <View className={`h-2 w-2 rounded-full ${isNext ? 'bg-red' : done ? 'bg-line' : 'bg-muted'}`} />
              <Text className={`flex-1 font-body-semi text-[16px] ${done ? 'text-muted' : 'text-white'}`}>{session.name}</Text>
              <Text className="w-12 font-body text-[15px] text-muted">{session.start ? formatViewerWeekday(session.start) : ''}</Text>
              <Text numberOfLines={1} className={`min-w-[84px] text-right font-body-semi text-[15px] tnum ${done ? 'text-muted' : 'text-white'}`}>
                {session.start && session.hasTime ? formatViewerTime(session.start) : 'TBC'}
              </Text>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

function Championship({ standings }: { standings: DriverStanding[] }) {
  const [leader, ...chasers] = standings;
  const team = leader.Constructors[0]?.name;
  const gap = chasers[0] ? Number(leader.points) - Number(chasers[0].points) : null;
  return (
    <View>
      <SectionTitle>Championship</SectionTitle>
      <Card className="mb-3 flex-row overflow-hidden">
        <DriverNumberTile teamName={team} number={leader.Driver.permanentNumber} width={112} height={128} />
        <View className="flex-1 justify-center gap-1 px-4">
          <Text className="font-body-medium text-[14px] text-muted">Leader</Text>
          <Text className="font-display text-[26px] leading-[28px] text-white">
            {leader.Driver.givenName} {leader.Driver.familyName}
          </Text>
          <View className="flex-row items-baseline gap-2">
            <Text className="font-display text-[32px] text-red tnum">{leader.points}</Text>
            <Text className="font-body text-[14px] text-muted">
              points{gap != null ? `, ${gap} clear` : ''}
            </Text>
          </View>
        </View>
      </Card>
      <Card className="overflow-hidden">
        {chasers.slice(0, 4).map((s) => (
          <StandingRow
            key={s.Driver.driverId}
            position={s.position ?? s.positionText}
            teamName={s.Constructors[0]?.name}
            name={`${s.Driver.givenName} ${s.Driver.familyName}`}
            figure={`${s.points} pts`}
            href={`/drivers/${s.Driver.driverId}`}
          />
        ))}
      </Card>
      <View className="mt-4">
        <SecondaryButton href="/standings">Full standings</SecondaryButton>
      </View>
    </View>
  );
}
