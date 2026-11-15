import { Image, type ImageContentPosition } from 'expo-image';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import type { Photo } from '@/data/photos';

/** '50% 40%' (CSS object-position) as expo-image's left/top object. */
function focusOf(focus?: string): ImageContentPosition {
  if (!focus) return 'center';
  const [left, top] = focus.split(' ');
  return { left: left as `${number}%`, top: (top ?? '50%') as `${number}%` };
}

/** Where the dark scrim sits so text over the photo stays readable. */
export type Scrim = 'left' | 'bottom' | 'heavy' | 'phone' | 'none';

const SCRIMS: Record<Exclude<Scrim, 'none'>, string> = {
  left: 'linear-gradient(90deg, rgba(14,16,19,.96) 0%, rgba(14,16,19,.82) 38%, rgba(14,16,19,.25) 75%, rgba(14,16,19,.05) 100%), linear-gradient(0deg, rgba(14,16,19,.85) 0%, rgba(14,16,19,0) 45%)',
  bottom: 'linear-gradient(0deg, rgba(14,16,19,.95) 22%, rgba(14,16,19,.55) 55%, rgba(14,16,19,.12) 100%)',
  heavy: 'linear-gradient(90deg, rgba(14,16,19,.97) 30%, rgba(14,16,19,.7) 100%)',
  // Text runs the full width on a phone, so the dark rises from the bottom instead of the left.
  phone: 'linear-gradient(0deg, rgba(14,16,19,.97) 0%, rgba(14,16,19,.9) 40%, rgba(14,16,19,.55) 70%, rgba(14,16,19,.2) 100%)',
};

/**
 * A photo filling its box, darkened behind the text that sits on it, with the licence credit always
 * shown (the licences require it). Without a photo it falls back to a plain panel, optionally
 * tinted, so callers lay out the same either way.
 */
export function CreditedImage({
  photo,
  scrim = 'bottom',
  creditPosition = 'top-right',
  eager = false,
  tint,
  className = '',
  children,
}: {
  photo?: Photo;
  scrim?: Scrim;
  creditPosition?: 'top-right' | 'inline' | 'none';
  /** The first photo on screen loads straight away; the rest wait until they're near. */
  eager?: boolean;
  /** Fallback colour wash when there is no photo (e.g. a team colour). */
  tint?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <View className={`relative overflow-hidden bg-surface ${className}`}>
      {photo ? (
        <Image
          source={photo.source}
          contentFit="cover"
          contentPosition={focusOf(photo.focus)}
          priority={eager ? 'high' : 'normal'}
          loading={eager ? 'eager' : 'lazy'}
          transition={eager ? 0 : 200}
          alt=""
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : tint ? (
        <View className="absolute inset-0" style={{ backgroundImage: `linear-gradient(120deg, ${tint}33 0%, ${tint}0d 60%, transparent 100%)` } as object} />
      ) : null}
      {photo && scrim !== 'none' ? <View className="absolute inset-0" style={{ backgroundImage: SCRIMS[scrim] } as object} /> : null}
      <View className="relative flex-1">{children}</View>
      {photo && creditPosition === 'top-right' ? (
        <Text className="absolute right-3 top-3 bg-ground/60 px-2 py-1 font-body text-[11px] text-paper/70">{photo.credit}</Text>
      ) : null}
    </View>
  );
}

/** The credit line on its own, for layouts that place it inside the content. */
export function PhotoCredit({ photo }: { photo?: Photo }) {
  return photo ? <Text className="mt-3 font-body text-[11px] text-paper/70">{photo.credit}</Text> : null;
}
