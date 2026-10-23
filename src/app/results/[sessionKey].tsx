import { useQuery } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { QualifyingResult, RaceResult, Session } from '@/api/types';
import { Card, Page } from '@/components/layout/Page';
import { StandingRow } from '@/components/StandingRow';
import { PrimaryButton } from '@/components/ui/Buttons';
import { EmptyState, ErrorState, errorMessage, PageLoading, SkeletonRows } from '@/components/ui/States';
import { getMeetings, getSeasonSessionTimeline, getSession } from '@/data/repository';
import { getSessionContent, type DriverLapSummary } from '@/data/sessionContent';
import { formatLapTime, formatViewerTime, sessionStart } from '@/domain/dates';

export default function SessionResults() {
  const { sessionKey } = useLocalSearchParams<{ sessionKey: string }>();
  const key = Number(sessionKey);

  const timeline = useQuery({ queryKey: ['timeline'], queryFn: getSeasonSessionTimeline });
  // A session outside this season's timeline (an old shared link) is still looked up directly.
  const inTimeline = timeline.data?.find((s) => s.session_key === key);
  const direct = useQuery({ queryKey: ['session', key], queryFn: () => getSession(key), enabled: timeline.isSuccess && !inTimeline });
  const session = inTimeline ?? direct.data ?? undefined;
  const meetings = useQuery({ queryKey: ['meetings', session?.year], queryFn: () => getMeetings(session!.year), enabled: !!session });
  const meeting = meetings.data?.find((m) => m.meeting_key === session?.meeting_key);

  const sessions = timeline.data ?? [];
  const index = sessions.findIndex((s) => s.session_key === key);
  const previous = index > 0 ? sessions[index - 1] : undefined;
  const next = index >= 0 ? sessions[index + 1] : undefined;
  const weekend = sessions.filter((s) => s.meeting_key === session?.meeting_key);

  // Arrow keys step through the season, as swiping did in the app.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (event.key === 'ArrowLeft' && previous) router.replace(`/results/${previous.session_key}`);
      if (event.key === 'ArrowRight' && next) router.replace(`/results/${next.session_key}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previous, next]);

  if (timeline.isPending || (!inTimeline && direct.isPending && timeline.isSuccess)) return <PageLoading />;
  if (!session) {
    return (
      <Page>
        <ErrorState
          title="This session couldn't be found"
          detail={timeline.isError ? errorMessage(timeline.error) : 'The link may point to a session that has not run yet.'}
          onRetry={() => (timeline.isError ? timeline.refetch() : direct.refetch())}
        />
      </Page>
    );
  }

  const meetingName = meeting?.meeting_name ?? session.country_name ?? '';
  const start = sessionStart(session);
  return (
    <Page>
      <Head>
        <title>{`${meetingName} ${session.session_name} · TrackiMetrix`}</title>
      </Head>

      <View className="mb-6 gap-5 md:mb-8">
        <View className="flex-row flex-wrap items-end justify-between gap-4">
          <View className="gap-1">
            <Text className="font-display-semi text-[17px] text-red">{meetingName}</Text>
            <Text accessibilityRole="header" className="font-display text-[40px] leading-[42px] text-white md:text-[52px] md:leading-[54px]">
              {session.session_name}
            </Text>
            <Text className="font-body text-[15px] text-muted">
              {[session.circuit_short_name, start ? new Date(start).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : null, start ? formatViewerTime(start) : null]
                .filter(Boolean)
                .join(', ')}
            </Text>
          </View>
          <View className="flex-row gap-2">
            {session.session_type === 'Race' ? <PrimaryButton href={`/replay/${session.session_key}`}>Watch the replay</PrimaryButton> : null}
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <StepButton session={previous} direction="previous" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerClassName="gap-1.5">
            {weekend.map((s) => {
              const active = s.session_key === key;
              return (
                <Link key={s.session_key} href={`/results/${s.session_key}`} replace asChild>
                  <Pressable
                    accessibilityState={{ selected: active }}
                    className={`rounded-full border px-4 py-2 transition-colors ${active ? 'border-white bg-white' : 'border-line hover:border-muted'}`}
                  >
                    <Text className={`font-body-semi text-[14px] ${active ? 'text-ground' : 'text-muted'}`}>{s.session_name}</Text>
                  </Pressable>
                </Link>
              );
            })}
          </ScrollView>
          <StepButton session={next} direction="next" />
        </View>
      </View>

      <SessionBody session={session} />
    </Page>
  );
}

function StepButton({ session, direction }: { session?: Session; direction: 'previous' | 'next' }) {
  const label = direction === 'previous' ? 'Previous session' : 'Next session';
  const glyph = direction === 'previous' ? '‹' : '›';
  if (!session) {
    return (
      <View className="h-10 w-10 items-center justify-center rounded-full border border-line/40" accessibilityLabel={`${label} (none)`}>
        <Text className="font-display text-[24px] leading-[26px] text-line">{glyph}</Text>
      </View>
    );
  }
  return (
    <Link href={`/results/${session.session_key}`} replace asChild>
      <Pressable
        accessibilityLabel={`${label}: ${session.session_name}`}
        className="h-10 w-10 items-center justify-center rounded-full border border-line transition-colors hover:border-muted hover:bg-surface active:scale-95"
      >
        <Text className="font-display text-[24px] leading-[26px] text-white">{glyph}</Text>
      </Pressable>
    </Link>
  );
}

function SessionBody({ session }: { session: Session }) {
  const content = useQuery({ queryKey: ['sessionContent', session.session_key], queryFn: () => getSessionContent(session) });
  if (content.isPending) {
    return (
      <Card className="overflow-hidden">
        <SkeletonRows count={12} />
      </Card>
    );
  }
  if (content.isError) {
    return <ErrorState title="These results didn't load" detail={errorMessage(content.error)} onRetry={() => content.refetch()} />;
  }

  const data = content.data;
  switch (data.kind) {
    case 'race':
    case 'sprint':
      return <Classification results={data.results} />;
    case 'qualifying':
      return <QualifyingTable results={data.results} />;
    case 'laps':
      return <LapTable summaries={data.summaries} provisional={data.provisional} sessionName={session.session_name} />;
    case 'liveRestricted':
      return (
        <EmptyState
          title="This session is live"
          detail="Timing for a session in progress isn't available on the free data feed this site uses. Results appear here about half an hour after it finishes."
        />
      );
  }
}

const fullName = (r: { Driver: { givenName: string; familyName: string } }) => `${r.Driver.givenName} ${r.Driver.familyName}`;

/**
 * What the right-hand column says for one car. A lapped car's `time` is a gap measured on the lap
 * it finished on ("+2.171" for a car a lap down), which reads as being two seconds behind the car
 * above it — so it's shown as laps down, counted from the winner's total, instead.
 */
function raceOutcome(r: RaceResult, winnerLaps: number) {
  if (r.status === 'Finished') return r.Time?.time || 'Finished';
  if (r.status === 'Lapped' || r.status.startsWith('+')) {
    const down = winnerLaps - Number(r.laps);
    return down > 0 ? `+${down} ${down === 1 ? 'lap' : 'laps'}` : 'Lapped';
  }
  return r.status === 'Retired' ? `Retired, lap ${r.laps}` : r.status;
}

/** Classification with what happened to each car: the winner's time, gaps, laps down, retirements. */
function Classification({ results }: { results: RaceResult[] }) {
  const fastest = results.find((r) => r.FastestLap?.rank === '1');
  const winnerLaps = Number(results[0]?.laps) || 0;
  return (
    <View className="gap-3">
      <Card className="overflow-hidden">
        {results.map((r, i) => {
          const finished = r.status === 'Finished' || r.status === 'Lapped' || r.status.startsWith('+');
          const outcome = raceOutcome(r, winnerLaps);
          const gained = Number(r.grid) > 0 ? Number(r.grid) - Number(r.position) : null;
          return (
            <View key={r.Driver.driverId} className={i ? 'border-t border-line/60' : ''}>
              <StandingRow
                position={r.positionText === 'R' || r.positionText === 'D' || r.positionText === 'W' ? r.positionText : r.position}
                teamName={r.Constructor.name}
                name={fullName(r)}
                detail={[r.Constructor.name, gained ? `${gained > 0 ? '▲' : '▼'} ${Math.abs(gained)} from P${r.grid}` : r.grid === '0' ? 'From the pit lane' : null]
                  .filter(Boolean)
                  .join(', ')}
                href={`/drivers/${r.Driver.driverId}`}
                figure={
                  <View className="items-end">
                    <Text className={`font-body-semi text-[15px] tnum ${finished ? 'text-white' : 'text-muted'}`}>{outcome}</Text>
                    <Text className="font-body text-[13px] text-muted tnum">{r.points === '0' ? '' : `${r.points} pts`}</Text>
                  </View>
                }
              />
            </View>
          );
        })}
      </Card>
      {fastest ? (
        <Text className="font-body text-[14px] text-muted">
          Fastest lap: {fullName(fastest)}, {fastest.FastestLap?.Time?.time} on lap {fastest.FastestLap?.lap}
        </Text>
      ) : null}
    </View>
  );
}

function QualifyingTable({ results }: { results: QualifyingResult[] }) {
  return (
    <Card className="overflow-hidden">
      <View className="hidden flex-row gap-3 border-b border-line px-4 py-2 md:flex">
        <Text className="flex-1 font-body-semi text-[13px] text-muted">Driver</Text>
        {['Q1', 'Q2', 'Q3'].map((q) => (
          <Text key={q} className="w-[84px] text-right font-body-semi text-[13px] text-muted">
            {q}
          </Text>
        ))}
      </View>
      {results.map((r, i) => (
        <View key={r.Driver.driverId} className={i ? 'border-t border-line/60' : ''}>
          <StandingRow
            position={r.position}
            teamName={r.Constructor.name}
            name={fullName(r)}
            detail={r.Constructor.name}
            href={`/drivers/${r.Driver.driverId}`}
            figure={<QualifyingTimes times={[r.Q1, r.Q2, r.Q3]} />}
          />
        </View>
      ))}
    </Card>
  );
}

/**
 * The time that decided a driver's grid slot is the last one they set, so it's the one emphasised.
 * On a phone only that one fits; the desktop shows all three in fixed columns.
 */
function QualifyingTimes({ times }: { times: (string | undefined)[] }) {
  const deciding = times.filter(Boolean).length - 1;
  return (
    <View className="flex-row gap-3">
      {times.map((time, q) => (
        <View key={q} className={`w-[84px] items-end ${q === deciding ? '' : 'hidden md:flex'}`}>
          <Text className={`text-[15px] tnum ${q === deciding ? 'font-body-semi text-white' : 'font-body text-muted'}`}>{time ?? ''}</Text>
        </View>
      ))}
    </View>
  );
}

const PROVISIONAL =
  'The official classification isn’t published yet. These rows are ordered by fastest lap, not by finishing position.';

function LapTable({ summaries, provisional, sessionName }: { summaries: DriverLapSummary[]; provisional: boolean; sessionName: string }) {
  if (!summaries.length) {
    return <EmptyState title="No laps recorded" detail={`Timing for ${sessionName} hasn't been published. A session that was cancelled or cut short may never get any.`} />;
  }
  const best = summaries[0]?.bestLap;
  return (
    <View className="gap-3">
      {provisional ? (
        <View className="flex-row items-center gap-3 rounded-inner border border-amber/45 bg-surface px-4 py-3">
          <View className="h-5 w-[3px] rounded-full bg-amber" />
          <Text className="flex-1 font-body text-[15px] text-muted">{PROVISIONAL}</Text>
        </View>
      ) : null}
      <Card className="overflow-hidden">
        {summaries.map((s, i) => (
          <View key={s.driverNumber} className={i ? 'border-t border-line/60' : ''}>
            <StandingRow
              position={String(i + 1)}
              teamName={s.teamName}
              teamColor={s.teamColour}
              name={s.name}
              detail={`${s.teamName ?? ''}, ${s.laps} ${s.laps === 1 ? 'lap' : 'laps'}`}
              figure={
                <View className="items-end">
                  <Text className="font-body-semi text-[15px] text-white tnum">{formatLapTime(s.bestLap)}</Text>
                  {i > 0 && best != null && s.bestLap != null ? (
                    <Text className="font-body text-[13px] text-muted tnum">+{(s.bestLap - best).toFixed(3)}</Text>
                  ) : null}
                </View>
              }
            />
          </View>
        ))}
      </Card>
    </View>
  );
}
