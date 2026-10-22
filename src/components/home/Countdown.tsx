import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

/**
 * Ticks off the wall clock rather than counting down a stored remainder, so it stays right across
 * a backgrounded tab. Clamped at zero once the race has started. Each unit sits in a fixed-width
 * slot with tabular figures, so the colons don't shuffle every second.
 */
export function Countdown({ to }: { to: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = Math.max(0, to - now);
  const units = [
    { value: Math.floor(remaining / 86_400_000), label: 'days', wide: true },
    { value: Math.floor(remaining / 3_600_000) % 24, label: 'hrs' },
    { value: Math.floor(remaining / 60_000) % 60, label: 'min' },
    { value: Math.floor(remaining / 1000) % 60, label: 'sec' },
  ];

  return (
    <View accessibilityLabel={`Lights out in ${units.map((u) => `${u.value} ${u.label}`).join(', ')}`} className="flex-row items-start">
      {units.map((unit, i) => (
        <View key={unit.label} className="flex-row items-start">
          {i > 0 ? <Text className="px-1 font-display text-[44px] leading-[48px] text-red md:text-[56px] md:leading-[60px]">:</Text> : null}
          <View className="items-center">
            <Text
              className={`text-center font-display text-[44px] leading-[48px] text-white tnum md:text-[56px] md:leading-[60px] ${
                unit.wide ? 'min-w-[2.6ch]' : 'min-w-[2ch]'
              }`}
            >
              {String(unit.value).padStart(2, '0')}
            </Text>
            <Text className="font-body-medium text-[13px] text-muted">{unit.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
