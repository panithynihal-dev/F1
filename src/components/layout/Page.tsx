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

/** A page's own heading. `kicker` is context the title alone can't carry (the season, the round). */
export function PageTitle({
  title,
  kicker,
  script = false,
  children,
}: {
  title: string;
  kicker?: string;
  /** Write the title in the F1-style brush script (plain white, no motion) instead of caps. */
  script?: boolean;
  children?: ReactNode;
}) {
  return (
    <View className="flex-row flex-wrap items-end justify-between gap-4">
      <View className="min-w-0 max-w-full shrink gap-1">
        {script ? (
          // The script's letters are small for their size, so it runs bigger than the caps; the
          // padding keeps the swashes from being clipped, and the capital's opening swash clear of
          // the screen edge.
          <Text
            accessibilityRole="header"
            className="-mr-3 pl-2 pr-3 pt-2 font-signature text-[76px] leading-[84px] text-paper md:text-[124px] md:leading-[132px]"
          >
            {title}
          </Text>
        ) : (
          <Text accessibilityRole="header" className="font-title text-[56px] uppercase leading-[52px] text-paper md:text-[88px] md:leading-[81px]">
            {title}
          </Text>
        )}
        {kicker ? <Text className="mt-2 font-body text-[15px] text-muted md:text-[17px]">{kicker}</Text> : null}
      </View>
      {children ? <View className="flex-row flex-wrap items-center gap-2">{children}</View> : null}
    </View>
  );
}

/** A section heading inside a page. */
export function SectionTitle({
  children,
  aside,
  script = false,
}: {
  children: string;
  aside?: ReactNode;
  /** Write the heading in the F1-style brush script (plain white, no motion) instead of caps. */
  script?: boolean;
}) {
  return (
    <View className="mb-4 flex-row items-baseline justify-between gap-3">
      {script ? (
        // Bigger than the caps (the script's letters are small for their size), padded so the
        // swashes aren't clipped.
        <Text accessibilityRole="header" className="-mr-3 pl-1 pr-3 pt-1 font-signature text-[34px] leading-[44px] text-paper md:text-[64px] md:leading-[72px]">
          {children}
        </Text>
      ) : (
        <Text accessibilityRole="header" className="font-title text-[30px] uppercase text-paper md:text-[34px]">
          {children}
        </Text>
      )}
      {aside}
    </View>
  );
}

/** The pit-wall panel: a flat fill edged by the kerb line. Square, no shadow. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`border border-line bg-surface ${className}`}>{children}</View>;
}
