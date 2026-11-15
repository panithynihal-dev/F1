import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

/** The content column every page sits in: one max width, one gutter, room for the phone tab bar. */
export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <View className={`mx-auto w-full px-4 pb-12 pt-6 md:px-8 md:pb-16 md:pt-10 ${wide ? 'max-w-[1400px]' : 'max-w-page'}`}>{children}</View>
  );
}

/** A page's own heading. `kicker` is context the title alone can't carry (the season, the round). */
export function PageTitle({ title, kicker, children }: { title: string; kicker?: string; children?: ReactNode }) {
  return (
    <View className="mb-6 flex-row flex-wrap items-end justify-between gap-4 md:mb-8">
      <View className="min-w-0 max-w-full shrink gap-1">
        <Text accessibilityRole="header" className="font-title text-[56px] uppercase leading-[52px] text-paper md:text-[88px] md:leading-[81px]">
          {title}
        </Text>
        {kicker ? <Text className="mt-2 font-body text-[15px] text-muted md:text-[17px]">{kicker}</Text> : null}
      </View>
      {children ? <View className="flex-row flex-wrap items-center gap-2">{children}</View> : null}
    </View>
  );
}

/** A section heading inside a page. */
export function SectionTitle({ children, aside }: { children: string; aside?: ReactNode }) {
  return (
    <View className="mb-4 flex-row items-baseline justify-between gap-3">
      <Text accessibilityRole="header" className="font-title text-[30px] uppercase text-paper md:text-[34px]">
        {children}
      </Text>
      {aside}
    </View>
  );
}

/** The pit-wall panel: a flat fill edged by the kerb line. Square, no shadow. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`border border-line bg-surface ${className}`}>{children}</View>;
}
