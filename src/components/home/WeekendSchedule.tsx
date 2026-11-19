import { Text, View } from 'react-native';

import type { RaceSchedule } from '@/api/types';
import { SectionTitle } from '@/components/layout/Page';
import { formatViewerTime, formatViewerWeekday, viewerTimeZoneName } from '@/logic/dates';
import { weekendProgress } from '@/logic/weekend';

const startsIn = (ms: number) => {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `Starts in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Starts in ${hours} h`;
  return `Starts in ${Math.round(hours / 24)} days`;
};

/**
 * The race weekend in the visitor's own time: one cell per session, left to right. The next
 * session is the red one (red marks what's next); sessions already run are dimmed.
 */
export function WeekendSchedule({ race, now }: { race: RaceSchedule; now: number }) {
  const sessions = weekendProgress(race, now);
  return (
    <View>
      <SectionTitle script aside={<Text className="font-body text-[14px] text-muted">Your time, {viewerTimeZoneName()}</Text>}>Race weekend</SectionTitle>
      <View className="gap-2 md:flex-row">
        {sessions.map((s) => {
          const next = s.state === 'next';
          const done = s.state === 'done';
          return (
            <View
              key={s.name}
              className={`flex-row items-center justify-between border p-4 md:flex-1 md:flex-col md:items-start md:gap-[22px] md:p-5 ${
                next ? 'border-red bg-red' : 'border-line bg-surface'
              }`}
            >
              <Text className={`font-title text-[24px] uppercase md:text-[28px] ${done ? 'text-muted' : 'text-paper'}`}>{s.name}</Text>
              <View className="items-end md:items-start">
                <Text className={`font-display text-[19px] tnum md:text-[22px] ${done ? 'text-muted' : 'text-paper'}`}>
                  {s.start ? `${formatViewerWeekday(s.start)} ${s.hasTime ? formatViewerTime(s.start) : 'time TBC'}` : 'To be confirmed'}
                </Text>
                {next && s.start ? <Text className="font-body text-[14px] text-white">{startsIn(s.start - now)}</Text> : null}
                {done ? <Text className="font-body text-[14px] text-muted">Done</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
