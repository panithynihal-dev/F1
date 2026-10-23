// One file per icon: the package's barrel export would pull every Phosphor icon into the bundle.
import type { Icon } from '@phosphor-icons/react';
import { CalendarDots } from '@phosphor-icons/react/dist/csr/CalendarDots';
import { FlagCheckered } from '@phosphor-icons/react/dist/csr/FlagCheckered';
import { House } from '@phosphor-icons/react/dist/csr/House';
import { Trophy } from '@phosphor-icons/react/dist/csr/Trophy';
import { Asset } from 'expo-asset';
import { Link, usePathname, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

const logo = Asset.fromModule(require('../../../assets/brand/logo_mark.png')).uri;

const ITEMS: { href: Href; label: string; icon: Icon; match: (path: string) => boolean }[] = [
  { href: '/', label: 'Home', icon: House, match: (p) => p === '/' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDots, match: (p) => p.startsWith('/calendar') },
  { href: '/results', label: 'Results', icon: FlagCheckered, match: (p) => p.startsWith('/results') || p.startsWith('/replay') },
  { href: '/standings', label: 'Standings', icon: Trophy, match: (p) => p.startsWith('/standings') || p.startsWith('/drivers') || p.startsWith('/teams') },
];

/**
 * A top bar on wide screens and a bottom tab bar on phones, where a thumb expects it. The current
 * section is marked with a red rule under its label, the way a timing screen marks the leader.
 */
export function SiteNav() {
  const path = usePathname();
  return (
    <>
      <View className="z-20 border-b border-line/70 bg-ground/90 backdrop-blur-md">
        <View className="mx-auto h-16 w-full max-w-page flex-row items-center justify-between px-4 md:px-8">
          <Link href="/" asChild>
            <Pressable className="flex-row items-center gap-2.5" accessibilityLabel="TrackiMetrix home">
              <img src={logo} alt="" width={30} height={30} />
              <Text className="font-display text-[22px] text-white">TrackiMetrix</Text>
            </Pressable>
          </Link>
          <View className="hidden h-full flex-row md:flex" accessibilityRole="navigation">
            {ITEMS.map(({ href, label, icon: Glyph, match }) => {
              const active = match(path);
              return (
                <Link key={label} href={href} asChild>
                  <Pressable accessibilityState={{ selected: active }} className="group h-full justify-center px-4">
                    <View className="flex-row items-center gap-2">
                      <Glyph size={18} weight={active ? 'fill' : 'regular'} color={active ? '#FFFFFF' : '#9A9AA2'} />
                      <Text className={`font-body-semi text-[15px] transition-colors ${active ? 'text-white' : 'text-muted group-hover:text-white'}`}>{label}</Text>
                    </View>
                    <View className={`absolute bottom-0 left-4 right-4 h-[3px] rounded-t-full ${active ? 'bg-red' : 'bg-transparent'}`} />
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>
      </View>

      <View
        accessibilityRole="navigation"
        className="fixed inset-x-0 bottom-0 z-20 flex-row border-t border-line bg-surface/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' as unknown as number }}
      >
        {ITEMS.map(({ href, label, icon: Glyph, match }) => {
          const active = match(path);
          return (
            <Link key={label} href={href} asChild>
              <Pressable accessibilityState={{ selected: active }} className="flex-1 items-center gap-1 pb-2 pt-2.5">
                <Glyph size={22} weight={active ? 'fill' : 'regular'} color={active ? '#E10600' : '#9A9AA2'} />
                <Text className={`font-body-semi text-[12px] ${active ? 'text-white' : 'text-muted'}`}>{label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </>
  );
}
