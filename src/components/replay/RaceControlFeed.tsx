import { useMemo } from 'react';
import { Text, View } from 'react-native';

import type { RaceControlMessage } from '@/api/types';

const FLAG_COLOUR: Record<string, string> = {
  BLUE: '#2F7BFF',
  YELLOW: '#FFC400',
  'DOUBLE YELLOW': '#FFC400',
  RED: '#E10600',
  GREEN: '#43B02A',
  CLEAR: '#43B02A',
  CHEQUERED: '#F3F3F1',
};

/** Race control messages written in sentence case, the way a person would read them out. */
const sentence = (text: string) =>
  (text.charAt(0) + text.slice(1).toLowerCase())
    .replace(/\b(fia|drs|vsc|sc)\b/gi, (m) => m.toUpperCase())
    .replace(/\(([a-z]{3})\)/g, (_, code: string) => `(${code.toUpperCase()})`);

/**
 * What race control has said up to this moment of the replay, newest first: flags, penalties,
 * investigations. It moves with the replay clock, so scrubbing back hides what hasn't happened yet.
 */
export function RaceControlFeed({ messages, at, limit = 7 }: { messages: RaceControlMessage[]; at: number; limit?: number }) {
  const sorted = useMemo(() => [...messages].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)), [messages]);
  const shown = sorted.filter((m) => Date.parse(m.date) <= at).slice(-limit).reverse();
  return (
    <View className="border border-line bg-surface px-4 py-3.5">
      <Text className="border-b border-strong pb-2 font-display-semi text-[15px] tracking-[0.04em] text-muted">Race control</Text>
      {shown.length ? (
        shown.map((m, i) => (
          <View key={`${m.date}-${i}`} className="flex-row gap-2.5 border-b border-line py-2.5">
            <Text className="w-7 font-display text-[14px] text-muted">{m.lap_number ? `L${m.lap_number}` : ''}</Text>
            <View className="flex-1 flex-row gap-1.5">
              {m.flag && FLAG_COLOUR[m.flag] ? <View className="mt-1 h-2 w-2" style={{ backgroundColor: FLAG_COLOUR[m.flag] }} /> : null}
              <Text className="flex-1 font-body text-[13px] leading-[18px] text-paper">{sentence(m.message)}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text className="py-3 font-body text-[13px] text-muted">Nothing from race control yet.</Text>
      )}
    </View>
  );
}
