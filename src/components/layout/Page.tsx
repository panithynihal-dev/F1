import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

/** The content column every page sits in: one max width, one gutter, room for the phone tab bar. */
export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <View className={`mx-auto w-full px-4 pb-28 pt-6 md:px-8 md:pb-16 md:pt-10 ${wide ? 'max-w-[1400px]' : 'max-w-page'}`}>{children}</View>
  );
}

/** A page's own heading. `kicker` is context the title alone can't carry (the season, the round). */
export function PageTitle({ title, kicker, children }: { title: string; kicker?: string; children?: ReactNode }) {
  return (
    <View className="mb-6 flex-row flex-wrap items-end justify-between gap-4 md:mb-8">
      <View className="gap-1">
        {kicker ? <Text className="font-display-semi text-[17px] text-red">{kicker}</Text> : null}
        <Text accessibilityRole="header" className="font-display text-[40px] leading-[42px] text-white md:text-[52px] md:leading-[54px]">
          {title}
        </Text>
      </View>
      {children ? <View className="flex-row flex-wrap items-center gap-2">{children}</View> : null}
    </View>
  );
}

/** A section heading inside a page. */
export function SectionTitle({ children, aside }: { children: string; aside?: ReactNode }) {
  return (
    <View className="mb-3 flex-row items-baseline justify-between gap-3">
      <Text accessibilityRole="header" className="font-display text-[24px] text-white">
        {children}
      </Text>
      {aside}
    </View>
  );
}

/** The app's outlined panel: identified by its fill, edged by a quiet border, no shadow. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-card border border-line bg-surface ${className}`}>{children}</View>;
}
