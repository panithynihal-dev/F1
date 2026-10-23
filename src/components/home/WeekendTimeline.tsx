import { Text, View } from 'react-native';

import type { RaceSchedule } from '@/api/types';
import { formatViewerTime, formatViewerWeekday, viewerTimeZoneName } from '@/domain/dates';
import { weekendSessions } from '@/domain/weekend';

const relative = (ms: number) => {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} h`;
  return `in ${Math.round(hours / 24)} days`;
};

/**
 * The race weekend as a line of stops, in the visitor's own time. Sessions already run are spent,
 * the next one is lit and says how long until it starts. A table read top to bottom; this reads
 * like the weekend does, left to right.
 */
export function WeekendTimeline({ race, now }: { race: RaceSchedule; now: number }) {
  const sessions = weekendSessions(race);
  const nextIndex = sessions.findIndex((s) => (s.start ?? 0) > now);
  return (
    <View>
      <View className="mb-4 flex-row flex-wrap items-baseline justify-between gap-2">
        <Text accessibilityRole="header" className="font-display text-[26px] text-white">
          Race weekend
        </Text>
        <Text className="font-body text-[14px] text-muted">Times in your timezone, {viewerTimeZoneName()}</Text>
      </View>
      <View className="gap-3 md:flex-row md:gap-0">
        {sessions.map((session, i) => {
          const isNext = i === nextIndex;
          const done = session.start != null && session.start < now && !isNext;
          const isRace = session.name === 'Race';
          return (
            <View key={session.name} className="flex-row gap-3 md:flex-1 md:flex-col md:gap-3">
              {/* The rail: a dot per session joined by a line, spent sessions dimmed. */}
              <View className="items-center md:flex-row">
                <View
                  className={`h-3.5 w-3.5 rounded-full border-2 ${
                    isNext ? 'border-red bg-red' : done ? 'border-line bg-line' : isRace ? 'border-white bg-ground' : 'border-muted bg-ground'
                  }`}
                  style={isNext ? ({ boxShadow: '0 0 0 5px rgba(225,6,0,0.18)' } as object) : undefined}
                />
                {i < sessions.length - 1 ? <View className={`w-0.5 flex-1 md:h-0.5 md:w-auto ${done ? 'bg-line' : 'bg-line/50'}`} /> : null}
              </View>
              <View className="flex-1 gap-0.5 pb-2 md:pr-4">
                <Text className={`font-body-semi text-[16px] ${done ? 'text-muted' : 'text-white'} ${isRace ? 'font-display text-[19px]' : ''}`}>
                  {session.name}
                </Text>
                <Text className={`font-body text-[14px] tnum ${done ? 'text-muted/70' : 'text-muted'}`}>
                  {session.start ? `${formatViewerWeekday(session.start)} ${session.hasTime ? formatViewerTime(session.start) : 'time to be confirmed'}` : 'To be confirmed'}
                </Text>
                {isNext && session.start ? <Text className="font-body-semi text-[14px] text-red">{relative(session.start - now)}</Text> : null}
                {done ? <Text className="font-body text-[13px] text-muted/70">Done</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
