// One file per icon: the package's barrel export would pull every Phosphor icon into the bundle.
import type { Icon } from '@phosphor-icons/react';
import { CalendarDots } from '@phosphor-icons/react/dist/csr/CalendarDots';
import { FlagCheckered } from '@phosphor-icons/react/dist/csr/FlagCheckered';
import { House } from '@phosphor-icons/react/dist/csr/House';
import { Trophy } from '@phosphor-icons/react/dist/csr/Trophy';
import { useQuery } from '@tanstack/react-query';
import { Asset } from 'expo-asset';
import { Link, usePathname, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { getSchedule, nextRace } from '@/data/repository';
import { raceStart } from '@/domain/dates';
import { useNow } from '@/hooks/useNow';

const logo = Asset.fromModule(require('../../../assets/brand/logo_mark.png')).uri;

const ITEMS: { href: Href; label: string; icon: Icon; match: (path: string) => boolean }[] = [
  { href: '/', label: 'Home', icon: House, match: (p) => p === '/' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDots, match: (p) => p.startsWith('/calendar') },
  { href: '/results', label: 'Results', icon: FlagCheckered, match: (p) => p.startsWith('/results') || p.startsWith('/replay') },
  { href: '/standings', label: 'Standings', icon: Trophy, match: (p) => p.startsWith('/standings') || p.startsWith('/drivers') || p.startsWith('/teams') },
];

/** "6d 05h" until lights out, or null once the season's last race has started. */
function useLightsOut() {
  const now = useNow();
  const schedule = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });
  const race = schedule.data ? nextRace(schedule.data, now) : null;
  const start = race ? raceStart(race) : null;
  if (!race || !start || start <= now) return null;
  const mins = Math.floor((start - now) / 60_000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  return { name: race.raceName.replace(' Grand Prix', ''), left: d > 0 ? `${d}d ${String(h).padStart(2, '0')}h` : `${h}h ${String(mins % 60).padStart(2, '0')}m` };
}

/**
 * A top bar on wide screens and a bottom tab bar on phones, where a thumb expects it. The current
 * section is marked with a red rule under its label, the way a timing screen marks the leader.
 */
export function SiteNav() {
  const path = usePathname();
  const lightsOut = useLightsOut();
  return (
    <>
      <View className="z-20 border-b border-line bg-ground">
        <View className="mx-auto h-14 w-full max-w-page flex-row items-center justify-between px-4 md:h-16 md:px-8">
          <Link href="/" asChild>
            <Pressable className="flex-row items-center gap-2.5" accessibilityLabel="TrackiMetrix home">
              <img src={logo} alt="" width={28} height={28} />
              <Text className="font-title text-[22px] uppercase text-paper md:text-[24px]">TrackiMetrix</Text>
            </Pressable>
          </Link>
          <View className="hidden h-full flex-row md:flex" accessibilityRole="navigation">
            {ITEMS.map(({ href, label, match }) => {
              const active = match(path);
              return (
                <Link key={label} href={href} asChild>
                  <Pressable accessibilityState={{ selected: active }} className="group h-full justify-center px-5">
                    <Text
                      className={`font-display text-[18px] uppercase tracking-[0.06em] transition-colors ${active ? 'text-paper' : 'text-muted group-hover:text-paper'}`}
                    >
                      {label}
                    </Text>
                    <View className={`absolute bottom-0 left-5 right-5 h-[3px] ${active ? 'bg-red' : 'bg-transparent'}`} />
                  </Pressable>
                </Link>
              );
            })}
          </View>
          {lightsOut ? (
            <Link href="/calendar" asChild>
              <Pressable className="flex-row items-baseline gap-2" accessibilityLabel={`${lightsOut.name} lights out in ${lightsOut.left}`}>
                <Text className="hidden font-body text-[14px] text-muted md:flex">{lightsOut.name} in</Text>
                <Text className="font-display-semi text-[15px] tracking-[0.04em] text-muted md:hidden">Lights out in</Text>
                <Text className="font-display text-[16px] text-paper tnum md:text-[18px]">{lightsOut.left}</Text>
              </Pressable>
            </Link>
          ) : (
            <View />
          )}
        </View>
      </View>

      <View
        accessibilityRole="navigation"
        className="fixed inset-x-0 bottom-0 z-20 flex-row border-t border-line bg-surface md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' as unknown as number }}
      >
        {ITEMS.map(({ href, label, icon: Glyph, match }) => {
          const active = match(path);
          return (
            <Link key={label} href={href} asChild>
              <Pressable accessibilityState={{ selected: active }} className="flex-1 items-center gap-1 pb-2 pt-1.5">
                <View className={`mb-1 h-[3px] w-5 ${active ? 'bg-red' : 'bg-transparent'}`} />
                <Glyph size={20} weight={active ? 'fill' : 'regular'} color={active ? '#F3F3F1' : '#8E949D'} />
                <Text className={`font-display text-[12px] uppercase tracking-[0.05em] ${active ? 'text-paper' : 'text-muted'}`}>{label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </>
  );
}
