import { CaretLeft } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { CaretRight } from '@phosphor-icons/react/dist/csr/CaretRight';
import type { Href } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import { CreditedImage } from '@/components/ui/CreditedImage';
import { HelmetText } from '@/components/ui/HelmetText';
import type { Photo } from '@/data/photos';
import type { FlowPalette } from '@/logic/helmets';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface HeroSlide {
  key: string;
  /** Short name under the progress bar ("Up next: Las Vegas"). */
  label: string;
  /** The plate above the title ("Round 21 of 23"). */
  kicker: string;
  /** Gold plate: only for a decided title. */
  gold?: boolean;
  /** Title lines, joined with a line break. */
  title: string[];
  /** Fill the title with someone's helmet or team colours. */
  palette?: FlowPalette;
  sub: string;
  stats: { value: string; label: string }[];
  primary: { label: string; href: Href };
  secondary: { label: string; href: Href };
  photo?: Photo;
}

const SLIDE_MS = 8000;

/**
 * The home page's lead: a full-bleed photo carousel of what matters this week (the next race, a
 * decided title, the last winner). Moves on by itself every 8 s, pauses while hovered or focused,
 * never moves by itself under reduced motion, and can be stepped with the arrows, the progress
 * labels, the keyboard or a swipe.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const phone = width < 768;
  const touchX = useRef<number | null>(null);

  const go = useCallback((to: number) => setIndex((to + slides.length) % slides.length), [slides.length]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  if (!slides.length) return null;
  const autoplay = !reduced && slides.length > 1;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="This week in Formula 1"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        if (start != null && end != null && Math.abs(end - start) > 40) (end < start ? next : prev)();
        touchX.current = null;
      }}
      style={{ position: 'relative', height: phone ? 640 : 720, overflow: 'hidden', borderBottom: '1px solid #272C34' }}
    >
      {slides.map((s, i) => (
        <div
          key={s.key}
          aria-hidden={i !== index}
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${slides.length}: ${s.label}`}
          style={{ position: 'absolute', inset: 0, opacity: i === index ? 1 : 0, transition: 'opacity 450ms ease', pointerEvents: i === index ? 'auto' : 'none' }}
        >
          <Slide slide={s} phone={phone} eager={i === 0} />
        </div>
      ))}

      {/* Progress: one bar per slide, the current one filling over its time on screen. */}
      <View className="absolute inset-x-4 bottom-7 flex-row items-end gap-2 md:inset-x-0 md:bottom-9">
        <View className="mx-auto w-full max-w-page flex-row items-end gap-6 md:px-8 xl:px-12 2xl:px-16">
          <View className="flex-1 flex-row gap-1.5 md:gap-4">
            {slides.map((s, i) => (
              <Pressable key={s.key} onPress={() => go(i)} accessibilityRole="button" accessibilityLabel={`Show ${s.label}`} className="flex-1 pt-2">
                <View className={`h-[3px] overflow-hidden ${i < index ? 'bg-paper' : 'bg-strong'}`}>
                  {i === index ? (
                    autoplay ? (
                      <div
                        key={`${s.key}-${index}`}
                        className={`tm-progress ${paused ? 'paused' : ''}`}
                        onAnimationEnd={next}
                        style={{ height: '100%', background: '#E10600', ['--tm-slide-ms' as string]: `${SLIDE_MS}ms` }}
                      />
                    ) : (
                      <View className="h-full bg-red" />
                    )
                  ) : null}
                </View>
                <Text numberOfLines={1} className={`mt-2.5 hidden font-body text-[14px] md:flex ${i === index ? 'text-paper' : 'text-muted'}`}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="hidden flex-row gap-2 md:flex">
            <ArrowButton label="Previous slide" onPress={prev} icon="left" />
            <ArrowButton label="Next slide" onPress={next} icon="right" />
          </View>
        </View>
      </View>
    </div>
  );
}

function ArrowButton({ label, onPress, icon }: { label: string; onPress: () => void; icon: 'left' | 'right' }) {
  const Glyph = icon === 'left' ? CaretLeft : CaretRight;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="h-12 w-12 items-center justify-center border border-strong bg-ground/50 hover:border-paper">
      <Glyph size={20} color="#F3F3F1" />
    </Pressable>
  );
}

function Slide({ slide: s, phone, eager }: { slide: HeroSlide; phone: boolean; eager: boolean }) {
  const titleSize = phone ? 64 : 120;
  return (
    <CreditedImage photo={s.photo} scrim={phone ? 'phone' : 'left'} eager={eager} className="h-full" tint={s.palette?.accents[0]}>
      <View className="absolute inset-x-0 bottom-[110px] md:bottom-[120px]">
        <View className="mx-auto w-full max-w-page px-4 md:px-8 xl:px-12 2xl:px-16">
          <View className={`tm-slant self-start px-[18px] py-1 ${s.gold ? 'bg-gold' : 'bg-red'}`}>
            <Text className={`font-display text-[17px] uppercase tracking-[0.04em] ${s.gold ? 'text-ground' : 'text-white'}`}>{s.kicker}</Text>
          </View>
          <View className="mt-3.5">
            {s.palette ? (
              <HelmetText palette={s.palette} size={titleSize} as="h2" fluid>
                {s.title.join('\n')}
              </HelmetText>
            ) : (
              <Text accessibilityRole="header" className="font-title uppercase text-paper" style={{ fontSize: titleSize, lineHeight: titleSize * 0.92 }}>
                {s.title.join('\n')}
              </Text>
            )}
          </View>
          <Text className="mt-4 max-w-[560px] font-body text-[16px] leading-[22px] text-[#D5D8DD] md:text-[19px] md:leading-[27px]">{s.sub}</Text>
          <View className="mt-5 flex-row gap-6 md:gap-10">
            {s.stats.map((st) => (
              <View key={st.label}>
                <Text className="font-display text-[40px] leading-[40px] text-paper tnum md:text-[56px] md:leading-[56px]">{st.value}</Text>
                <Text className="mt-1 font-body text-[14px] text-muted">{st.label}</Text>
              </View>
            ))}
          </View>
          <View className="mt-6 flex-row flex-wrap gap-3">
            <PrimaryButton href={s.primary.href}>{s.primary.label}</PrimaryButton>
            <SecondaryButton href={s.secondary.href}>{s.secondary.label}</SecondaryButton>
          </View>
        </View>
      </View>
    </CreditedImage>
  );
}
