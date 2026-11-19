import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Head from 'expo-router/head';
import { useMemo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

import type { ConstructorStanding, DriverStanding, RaceSchedule } from '@/api/types';
import { HeroCarousel, type HeroSlide } from '@/components/home/HeroCarousel';
import { biggestClimb, Podium } from '@/components/home/Podium';
import { fightForSecond, TitleFight } from '@/components/home/TitleFight';
import { WeekendSchedule } from '@/components/home/WeekendSchedule';
import { Band, Page, SectionTitle } from '@/components/layout/Page';
import { SecondaryButton } from '@/components/ui/Buttons';
import { ErrorState, errorMessage, PageLoading } from '@/components/ui/States';
import { actionPhoto, celebrationPhoto, circuitPhoto, teamPhoto } from '@/data/photos';
import { getConstructorStandings, getDriverStandings, getLastRaceResults, getSchedule, lastStartedRace, nextRace, type LastRaceResults } from '@/data/repository';
import { flagPalette, raceTitleParts } from '@/logic/flags';
import { isClinched, maxPointsLeft, racesLeft } from '@/logic/clinch';
import { formatViewerTime, formatViewerWeekday, raceStart, viewerTimeZoneName } from '@/logic/dates';
import { driverPalette, teamPalette } from '@/logic/helmets';
import { useNow } from '@/hooks/useNow';

const raceName = (name: string): HeroSlide['name'] => {
  const { script, wide } = raceTitleParts(name);
  return wide ? { kind: 'lockup', script, wide } : { kind: 'script', text: script };
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const ordinalWord = (n: number) => (['first', 'second', 'third'][n - 1] ?? `${n}th`);

export default function Home() {
  const schedule = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });
  // Ticks each minute, so the page rolls on to the next round once a race starts.
  const now = useNow();

  // The page keeps itself current over a race weekend, even if it was opened before the race:
  // the queries are keyed by the round that last started, so they ask again the moment a new race
  // starts, and keep asking every few minutes until that race's results are published. Until then
  // getLastRaceResults returns the round before, so the previous winner stays on the hero.
  const started = schedule.data ? lastStartedRace(schedule.data, now) : null;
  const startedRound = started?.round ?? '0';
  const weekend = !!started && now - (raceStart(started) ?? 0) < 2 * 86_400_000;
  const lastRace = useQuery({
    queryKey: ['lastRace', startedRound],
    queryFn: getLastRaceResults,
    enabled: !!schedule.data,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.round === startedRound || !started ? false : 5 * 60_000),
  });
  // Standings land around the same time as the results; refresh them through the weekend.
  const standingsRefresh = weekend ? 10 * 60_000 : false;
  const drivers = useQuery({ queryKey: ['driverStandings', startedRound], queryFn: getDriverStandings, placeholderData: keepPreviousData, refetchInterval: standingsRefresh });
  const constructors = useQuery({ queryKey: ['constructorStandings', startedRound], queryFn: getConstructorStandings, placeholderData: keepPreviousData, refetchInterval: standingsRefresh });
  const shownLast = lastRace.data;
  const { width } = useWindowDimensions();
  const phone = width < 768;

  const race = schedule.data ? nextRace(schedule.data, now) : null;
  const slides = useMemo(
    () => (schedule.data ? buildSlides(schedule.data, race, now, drivers.data, constructors.data, shownLast) : []),
    // Minute-level `now` is enough: the countdown on the slide is days / hours / minutes.
    [schedule.data, race, now, drivers.data, constructors.data, shownLast],
  );

  if (schedule.isPending) return <PageLoading />;
  if (schedule.isError) {
    return (
      <Page>
        <ErrorState title="The calendar didn’t load" detail={errorMessage(schedule.error)} onRetry={() => schedule.refetch()} />
      </Page>
    );
  }

  const pointsLeft = maxPointsLeft(schedule.data, 'drivers', now);
  const decided = !!drivers.data && isClinched(drivers.data.map((s) => Number(s.points)), pointsLeft);
  const afterRound = shownLast?.round;
  const second = drivers.data ? fightForSecond(drivers.data, pointsLeft) : null;
  return (
    <>
      <Head>
        <title>{race ? `${race.raceName} · TrackiMetrix` : 'TrackiMetrix'}</title>
      </Head>
      <HeroCarousel slides={slides} />

      {race && (raceStart(race) ?? 0) > now - 3 * 3_600_000 ? (
        <Band tone="surface" className="py-12 md:py-14">
          <WeekendSchedule race={race} now={now} />
        </Band>
      ) : null}

      <Page>
        <View>
          <View className="gap-14 lg:flex-row lg:gap-[72px] 2xl:gap-24">
            {shownLast ? (
              <View className="lg:w-[520px] 2xl:w-[600px]">
                <SectionTitle aside={<Text className="font-body text-[14px] text-muted">Round {shownLast.round}</Text>}>{shownLast.raceName}</SectionTitle>
                <Podium podium={shownLast.podium} results={shownLast.results} compact={phone} />
                <View className="mt-6">
                  <SecondaryButton href="/results">Full result</SecondaryButton>
                </View>
              </View>
            ) : null}

            {drivers.data?.length ? (
              <View className="lg:flex-1">
                <SectionTitle aside={afterRound ? <Text className="font-body text-[14px] text-muted">After round {afterRound}</Text> : undefined}>Drivers’ standings</SectionTitle>
                <TitleFight standings={drivers.data} decided={decided} compact={phone} />
                {second && pointsLeft > 0 ? <Text className="mt-[18px] font-body text-[15px] leading-[22px] text-[#C9CDD3]">{second}</Text> : null}
                <View className="mt-6">
                  <SecondaryButton href="/standings">Full standings</SecondaryButton>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </>
  );
}

/** The carousel's slides, from whatever has loaded: next race first, then titles and the last result. */
function buildSlides(
  schedule: RaceSchedule[],
  race: RaceSchedule | null,
  now: number,
  drivers?: DriverStanding[],
  constructors?: ConstructorStanding[],
  last?: LastRaceResults | null,
): HeroSlide[] {
  const slides: HeroSlide[] = [];
  const season = schedule[0]?.season ?? '';
  const roundsLeft = racesLeft(schedule, now);

  const start = race ? raceStart(race) : null;
  if (race && start) {
    const left = Math.max(0, start - now);
    const started = start <= now;
    const name = race.raceName.replace(' Grand Prix', '');
    slides.push({
      key: 'next',
      label: `${started ? 'Racing now' : 'Up next'}: ${name}`,
      kicker: `Round ${race.round} of ${schedule.length}`,
      title: race.raceName.includes('Grand Prix') ? [name, 'Grand Prix'] : [race.raceName],
      // "Las Vegas" in script over "GRAND PRIX", flowing in the host country's flag colours. A name
      // that doesn't end in "Grand Prix" ("Bahrain Grand Prix in Malaysia") goes all in script.
      palette: flagPalette(race.Circuit.Location.country),
      name: raceName(race.raceName),
      sub: started
        ? `${race.Circuit.circuitName}. The race is on now.`
        : `${race.Circuit.circuitName}. Lights out ${formatViewerWeekday(start)} ${race.time ? formatViewerTime(start) : ''} your time (${viewerTimeZoneName()}).`,
      stats: started
        ? []
        : [
            { value: String(Math.floor(left / 86_400_000)), label: 'days' },
            { value: String(Math.floor(left / 3_600_000) % 24).padStart(2, '0'), label: 'hours' },
            { value: String(Math.floor(left / 60_000) % 60).padStart(2, '0'), label: 'min' },
          ],
      primary: { label: 'Race weekend', href: '/calendar' },
      secondary: { label: 'Latest results', href: '/results' },
      photo: circuitPhoto(race.Circuit.circuitId),
    });
  }

  const driversLeft = maxPointsLeft(schedule, 'drivers', now);
  const leader = drivers?.[0];
  if (leader && drivers) {
    const champion = isClinched(drivers.map((s) => Number(s.points)), driversLeft);
    const team = leader.Constructors[leader.Constructors.length - 1]?.name;
    const gap = Number(leader.points) - Number(drivers[1]?.points ?? 0);
    slides.push({
      key: 'champion',
      label: `${champion ? 'Champion' : 'Leader'}: ${leader.Driver.familyName}`,
      kicker: champion ? `${season} World Champion` : 'Championship leader',
      gold: champion,
      title: [leader.Driver.givenName, leader.Driver.familyName],
      name: { kind: 'lockup', script: leader.Driver.givenName, wide: leader.Driver.familyName },
      palette: driverPalette(leader.Driver.driverId, team),
      sub: champion
        ? roundsLeft
          ? `Title decided with ${plural(roundsLeft, 'round')} still to run. ${team}.`
          : `The ${season} drivers’ champion. ${team}.`
        : `${gap} points clear with ${driversLeft} still to win. ${team}.`,
      stats: [
        { value: leader.points, label: 'points' },
        { value: leader.wins, label: 'wins' },
        { value: `+${gap}`, label: 'clear' },
      ],
      primary: { label: 'Driver page', href: `/drivers/${leader.Driver.driverId}` },
      secondary: { label: 'Standings', href: '/standings' },
      photo: celebrationPhoto(leader.Driver.driverId),
    });
  }

  const winner = last?.podium[0];
  if (last && winner) {
    const locality = schedule.find((r) => r.round === last.round)?.Circuit.Location.locality;
    const climb = biggestClimb(last.results);
    const fromPole = winner.grid === '1';
    slides.push({
      key: 'last',
      label: `${last.raceName.replace(' Grand Prix', '')}: ${winner.Driver.familyName} wins`,
      kicker: `Round ${last.round} result`,
      title: locality ? [`${winner.Driver.familyName} wins`, `in ${locality}`] : [`${winner.Driver.familyName} wins`],
      name: {
        kind: 'lockup',
        script: winner.Driver.givenName,
        wide: winner.Driver.familyName,
        after: locality ? `Wins in ${locality}` : 'Wins',
      },
      palette: driverPalette(winner.Driver.driverId, winner.Constructor.name),
      sub: [
        fromPole ? 'Won from pole.' : `Won from ${winner.grid === '0' ? 'the pit lane' : `P${winner.grid}`}.`,
        climb && climb.result.Driver.driverId !== winner.Driver.driverId
          ? `${climb.result.Driver.familyName} started P${climb.from} and finished ${ordinalWord(climb.to)}.`
          : '',
      ]
        .filter(Boolean)
        .join(' '),
      stats: [
        ...(winner.Time?.time ? [{ value: winner.Time.time, label: 'race time' }] : []),
        ...(climb ? [{ value: `P${climb.from} to P${climb.to}`, label: climb.result.Driver.familyName }] : []),
      ],
      primary: { label: 'Full result', href: '/results' },
      secondary: { label: 'Standings', href: '/standings' },
      photo: actionPhoto(winner.Driver.driverId),
    });
  }

  const teamLeader = constructors?.[0];
  if (teamLeader && constructors) {
    const left = maxPointsLeft(schedule, 'constructors', now);
    const champion = isClinched(constructors.map((s) => Number(s.points)), left);
    const runnerUp = constructors[1];
    const gap = Number(teamLeader.points) - Number(runnerUp?.points ?? 0);
    const id = teamLeader.Constructor.constructorId;
    slides.push({
      key: 'constructors',
      label: `Constructors: ${teamLeader.Constructor.name}`,
      kicker: champion ? `${season} Constructors’ Champion` : 'Constructors’ leader',
      gold: champion,
      title: [teamLeader.Constructor.name],
      name: { kind: 'script', text: teamLeader.Constructor.name },
      palette: teamPalette(id, teamLeader.Constructor.name),
      sub: champion
        ? `Decided with ${plural(roundsLeft, 'round')} to spare, ${gap} points clear of ${runnerUp?.Constructor.name ?? 'the rest'}.`
        : `${gap} points clear of ${runnerUp?.Constructor.name ?? 'the rest'}, with ${left} still to win.`,
      stats: [
        { value: teamLeader.points, label: 'points' },
        { value: teamLeader.wins, label: 'wins' },
        { value: `+${gap}`, label: 'clear' },
      ],
      primary: { label: 'Team page', href: `/teams/${id}` },
      secondary: { label: 'Standings', href: '/standings?tab=constructors' },
      photo: teamPhoto(id),
    });
  }
  return slides;
}
