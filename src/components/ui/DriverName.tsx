import { useState } from 'react';
import { View } from 'react-native';

import type { FlowPalette } from '@/logic/helmets';

import { HelmetText } from './HelmetText';

/**
 * A driver's name as a signature lockup: the first name in brush script over the surname in heavy
 * wide caps, both in the driver's helmet colours. Used on the Standings driver card and the driver
 * page header.
 *
 * The surname shrinks to fit the space it's given, so long names (Hülkenberg, Bortoleto) never
 * overflow; `maxSize` is its size when there's room.
 */
export function DriverName({
  given,
  family,
  palette,
  maxSize,
  as: Tag = 'div',
  fluid = false,
}: {
  given: string;
  family: string;
  palette: FlowPalette;
  /** Surname font size in px when it fits. */
  maxSize: number;
  /** The element the lockup renders as: the page's h1 (driver page), an h2 (Home hero), or a div. */
  as?: 'h1' | 'h2' | 'div';
  /** Paint with the live fluid simulation instead of the CSS drift. */
  fluid?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const size = width ? Math.min(maxSize, Math.floor(width / surnameEms(family))) : maxSize;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ opacity: width ? 1 : 0 }}>
      <Tag style={{ margin: 0 }}>
        {/* The script sits on the surname's shoulder, like a signature over printed caps. */}
        <HelmetText palette={palette} size={Math.max(28, Math.round(size * 1.1))} lineHeight={1} font="signature" fluid={fluid}>
          {given}
        </HelmetText>
        <span style={{ display: 'block', marginTop: -Math.round(size * 0.28) }}>
          <HelmetText palette={palette} size={size} lineHeight={1.05} font="wide" fluid={fluid}>
            {family}
          </HelmetText>
        </span>
      </Tag>
    </View>
  );
}

let measure: CanvasRenderingContext2D | null = null;

/** The surname's width in ems, measured in the real font (falls back to a safe estimate). */
function surnameEms(family: string) {
  if (typeof document === 'undefined') return family.length * 1;
  measure ??= document.createElement('canvas').getContext('2d');
  if (!measure) return family.length * 1;
  measure.font = '100px Unbounded_800ExtraBold';
  // A little extra so the last letter never touches the edge.
  return (measure.measureText(family.toUpperCase()).width / 100) * 1.03;
}
