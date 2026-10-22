import { Asset } from 'expo-asset';
import { Link, usePathname, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

const logo = Asset.fromModule(require('../../../assets/brand/logo_mark.png')).uri;

const ITEMS: { href: Href; label: string; match: (path: string) => boolean }[] = [
  { href: '/', label: 'Home', match: (p) => p === '/' },
  { href: '/calendar', label: 'Calendar', match: (p) => p.startsWith('/calendar') },
  { href: '/results', label: 'Results', match: (p) => p.startsWith('/results') || p.startsWith('/replay') },
  { href: '/standings', label: 'Standings', match: (p) => p.startsWith('/standings') || p.startsWith('/drivers') || p.startsWith('/teams') },
];

/**
 * A top bar on wide screens and a bottom tab bar on phones — the app's bottom navigation, where a
 * thumb expects it, and a conventional header where a mouse does.
 */
export function SiteNav() {
  const path = usePathname();
  return (
    <>
      <View className="sticky top-0 z-20 border-b border-line/70 bg-ground/90 backdrop-blur-md">
        <View className="mx-auto w-full max-w-page flex-row items-center justify-between px-4 py-3 md:px-8">
          <Link href="/" asChild>
            <Pressable className="flex-row items-center gap-2.5" accessibilityLabel="TrackiMetrix home">
              <img src={logo} alt="" width={30} height={30} />
              <Text className="font-display text-[22px] tracking-wide text-white">TrackiMetrix</Text>
            </Pressable>
          </Link>
          <View className="hidden flex-row gap-1 md:flex" accessibilityRole="navigation">
            {ITEMS.map((item) => {
              const active = item.match(path);
              return (
                <Link key={item.label} href={item.href} asChild>
                  <Pressable
                    accessibilityState={{ selected: active }}
                    className={`rounded-full px-4 py-2 transition-colors ${active ? 'bg-lifted' : 'hover:bg-surface'}`}
                  >
                    <Text className={`font-body-semi text-[15px] ${active ? 'text-white' : 'text-muted'}`}>{item.label}</Text>
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
        {ITEMS.map((item) => {
          const active = item.match(path);
          return (
            <Link key={item.label} href={item.href} asChild>
              <Pressable accessibilityState={{ selected: active }} className="flex-1 items-center gap-1 py-2.5">
                <View className={`h-1 w-6 rounded-full ${active ? 'bg-red' : 'bg-transparent'}`} />
                <Text className={`font-body-semi text-[13px] ${active ? 'text-white' : 'text-muted'}`}>{item.label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </>
  );
}
