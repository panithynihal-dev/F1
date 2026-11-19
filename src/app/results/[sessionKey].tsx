import { useQuery } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import type { QualifyingResult, Session } from '@/api/types';
import { Card, Page } from '@/components/layout/Page';
import { Classification, PodiumBand, RaceFacts } from '@/components/results/RaceSummary';
import { StandingRow } from '@/components/StandingRow';
import { PrimaryButton } from '@/components/ui/Buttons';
import { DriverName, ScriptName } from '@/components/ui/DriverName';
import { EmptyState, ErrorState, errorMessage, PageLoading, SkeletonRows } from '@/components/ui/States';
import { getMeetings, getSeasonSessionTimeline, getSession } from '@/data/repository';
import { getSessionContent, type DriverLapSummary } from '@/data/sessionContent';
import { formatLapTime, formatViewerTime, sessionStart } from '@/logic/dates';
import { flagPalette, raceTitleParts } from '@/logic/flags';

/** The race name, F1 style: "São Paulo" in script over "GRAND PRIX", flowing in the host country's flag colours. */
function RaceTitle({ name, country, wide }: { name: string; country?: string | null; wide: boolean }) {
  const palette = flagPalette(country);
  const { script, wide: caps } = raceTitleParts(name);
  return caps ? (
    <DriverName given={script} family={caps} palette={palette} maxSize={wide ? 96 : 48} as="h1" fluid />
  ) : (
    <ScriptName text={script} palette={palette} maxSize={wide ? 130 : 72} as="h1" fluid />
  );
}

export default function SessionResults() {
  const { sessionKey } = useLocalSearchParams<{ sessionKey: string }>();
  const key = Number(sessionKey);
  const wide = useWindowDimensions().width >= 768;

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
    <Page
      header={
        <View className="gap-6">
          <View className="flex-row flex-wrap items-end justify-between gap-4">
            {/* Full width on a phone (the replay button drops below); shares the row on desktop. */}
            <View className="min-w-0 max-w-full flex-1 basis-full gap-1.5 md:basis-0">
              <Text className="font-display-semi text-[15px] tracking-[0.04em] text-red">
                {[session.session_name, session.circuit_short_name, start ? new Date(start).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : null, start ? formatViewerTime(start) : null]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
              <RaceTitle name={meeting?.meeting_name ?? meetingName} country={meeting?.country_name ?? session.country_name} wide={wide} />
            </View>
            <View className="flex-row gap-2">
              {session.session_type === 'Race' ? <PrimaryButton href={`/replay/${session.session_key}`}>Watch the replay</PrimaryButton> : null}
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerClassName="gap-1.5">
              {weekend.map((s) => {
                const active = s.session_key === key;
                return (
                  <Link key={s.session_key} href={`/results/${s.session_key}`} replace asChild>
                    <Pressable
                      accessibilityState={{ selected: active }}
                      className={`border px-3.5 py-2.5 transition-colors md:px-5 ${active ? 'border-paper bg-paper' : 'border-line hover:border-muted'}`}
                    >
                      <Text className={`font-display text-[15px] uppercase tracking-[0.04em] md:text-[17px] ${active ? 'text-ground' : 'text-muted'}`}>{s.session_name}</Text>
                    </Pressable>
                  </Link>
                );
              })}
            </ScrollView>
            <StepButton session={previous} direction="previous" />
            <StepButton session={next} direction="next" />
          </View>
        </View>
      }
    >
      <Head>
        <title>{`${meetingName} ${session.session_name} · TrackiMetrix`}</title>
      </Head>
      <SessionBody session={session} />
    </Page>
  );
}

function StepButton({ session, direction }: { session?: Session; direction: 'previous' | 'next' }) {
  const label = direction === 'previous' ? 'Previous session' : 'Next session';
  const glyph = direction === 'previous' ? '‹' : '›';
  if (!session) {
    return (
      <View className="h-12 w-12 items-center justify-center border border-line" accessibilityLabel={`${label} (none)`}>
        <Text className="font-display text-[24px] leading-[26px] text-strong">{glyph}</Text>
      </View>
    );
  }
  return (
    <Link href={`/results/${session.session_key}`} replace asChild>
      <Pressable
        accessibilityLabel={`${label}: ${session.session_name}`}
        className="h-12 w-12 items-center justify-center border border-strong transition-colors hover:border-paper active:scale-95"
      >
        <Text className="font-display text-[24px] leading-[26px] text-paper">{glyph}</Text>
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
      return (
        <View className="gap-3">
          <PodiumBand results={data.results} />
          <RaceFacts results={data.results} />
          <View className="mt-11 md:mt-14">
            <Classification results={data.results} />
          </View>
        </View>
      );
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
        <View className="flex-row items-center gap-3 border border-amber/45 bg-surface px-4 py-3">
          <View className="h-5 w-[3px] bg-amber" />
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
