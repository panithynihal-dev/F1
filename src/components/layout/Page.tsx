import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

/** The side gutter every column on the site shares, so nav, hero and content line up on one edge. */
export const GUTTER = 'px-4 md:px-8 xl:px-12 2xl:px-16';

type Tone = 'ground' | 'surface' | 'header';

/**
 * A full-width section: its background runs edge to edge of the window while its content stays in
 * the page column. Alternating bands give wide screens structure out to the edges instead of a
 * narrow column floating on flat asphalt.
 */
export function Band({ children, tone = 'ground', className = '', wide = false }: { children: ReactNode; tone?: Tone; className?: string; wide?: boolean }) {
  const toneClass = tone === 'ground' ? 'bg-ground' : 'border-y border-line bg-surface';
  return (
    <View
      className={`w-full ${toneClass}`}
      // The header band carries a faint red wash from the top left, the same light the hero photos have.
      style={tone === 'header' ? ({ backgroundImage: 'linear-gradient(115deg, rgba(225,6,0,.10) 0%, rgba(225,6,0,0) 42%)' } as object) : undefined}
    >
      <View className={`mx-auto w-full ${wide ? 'max-w-[1600px]' : 'max-w-page'} ${GUTTER} ${className}`}>{children}</View>
    </View>
  );
}

/**
 * The page frame. `header` (title, tabs, champion strip) sits in a full-width header band; the
 * children follow in the page column. Pages built from their own bands pass `flush` and get no
 * column of their own.
 */
export function Page({ children, header, wide = false, flush = false }: { children: ReactNode; header?: ReactNode; wide?: boolean; flush?: boolean }) {
  return (
    <>
      {header ? (
        <Band tone="header" wide={wide} className="pb-7 pt-7 md:pb-9 md:pt-10">
          {header}
        </Band>
      ) : null}
      {flush ? (
        <View className="w-full pb-12 md:pb-16">{children}</View>
      ) : (
        <View className={`mx-auto w-full pb-12 md:pb-16 ${header ? 'pt-8 md:pt-10' : 'pt-10 md:pt-14'} ${wide ? 'max-w-[1600px]' : 'max-w-page'} ${GUTTER}`}>
          {children}
        </View>
      )}
    </>
  );
}

/**
 * A page's own heading, in wide caps (Unbounded SemiBold, after F1's broadcast graphics). `kicker`
 * is context the title alone can't carry (the season, the round).
 */
export function PageTitle({ title, kicker, children }: { title: string; kicker?: string; children?: ReactNode }) {
  return (
    <View className="flex-row flex-wrap items-end justify-between gap-4">
      <View className="min-w-0 max-w-full shrink gap-1">
        <Text accessibilityRole="header" className="font-heading text-[34px] uppercase leading-[42px] tracking-[0.04em] text-paper md:text-[56px] md:leading-[66px]">
          {title}
        </Text>
        {kicker ? <Text className="mt-2 font-body text-[15px] text-muted md:text-[17px]">{kicker}</Text> : null}
      </View>
      {children ? <View className="flex-row flex-wrap items-center gap-2">{children}</View> : null}
    </View>
  );
}

/** A section heading inside a page, in the same wide caps as page titles. */
export function SectionTitle({ children, aside }: { children: string; aside?: ReactNode }) {
  return (
    <View className="mb-4 flex-row items-baseline justify-between gap-3">
      <Text accessibilityRole="header" className="min-w-0 shrink font-heading text-[18px] uppercase leading-[26px] tracking-[0.04em] text-paper md:text-[24px] md:leading-[32px]">
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
