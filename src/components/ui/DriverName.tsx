import { useState } from 'react';
import { View } from 'react-native';

import type { FlowPalette } from '@/logic/helmets';

import { HelmetText } from './HelmetText';

/**
 * A driver's name as a signature lockup: the first name in brush script over the surname in heavy
 * wide caps, both in the driver's helmet colours. Used on the Standings driver card, the driver
 * page header and the Home hero (champion, last winner, and the next race: "Las Vegas" over
 * "GRAND PRIX" in flag colours).
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
  still = false,
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
  /** Keep the colours but hold them still (Calendar cards). */
  still?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const size = width ? Math.min(maxSize, Math.floor(width / textEms(family.toUpperCase(), 'Unbounded_800ExtraBold'))) : maxSize;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ opacity: width ? 1 : 0 }}>
      <Tag style={{ margin: 0 }}>
        {/* The script sits on the surname's shoulder, like a signature over printed caps. */}
        <HelmetText palette={palette} size={Math.max(28, Math.round(size * 1.1))} lineHeight={1} font="signature" fluid={fluid} still={still}>
          {given}
        </HelmetText>
        <span style={{ display: 'block', marginTop: -Math.round(size * 0.28) }}>
          <HelmetText palette={palette} size={size} lineHeight={1.05} font="wide" fluid={fluid} still={still}>
            {family}
          </HelmetText>
        </span>
      </Tag>
    </View>
  );
}

/**
 * A name written only in the brush script (the Home hero's constructors slide: "Mercedes"), in
 * team colours. Shrinks to fit like the surname above; `maxSize` is its size when there's room.
 */
export function ScriptName({
  text,
  palette,
  maxSize,
  as = 'h2',
  fluid = false,
  still = false,
  className = '',
}: {
  text: string;
  palette: FlowPalette;
  maxSize: number;
  as?: 'h1' | 'h2' | 'h3' | 'span';
  fluid?: boolean;
  still?: boolean;
  /** Extra classes for the text, e.g. text-center. */
  className?: string;
}) {
  const [width, setWidth] = useState(0);
  const size = width ? Math.min(maxSize, Math.floor(width / textEms(text, 'MrDafoe_400Regular'))) : maxSize;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ opacity: width ? 1 : 0 }}>
      <HelmetText palette={palette} size={size} lineHeight={1.1} font="signature" as={as} fluid={fluid} still={still} className={className}>
        {text}
      </HelmetText>
    </View>
  );
}

let measure: CanvasRenderingContext2D | null = null;

/** How wide a text is in ems, measured in the real font (falls back to a safe estimate). */
function textEms(text: string, fontFamily: string) {
  if (typeof document === 'undefined') return text.length;
  measure ??= document.createElement('canvas').getContext('2d');
  if (!measure) return text.length;
  measure.font = `100px ${fontFamily}`;
  // A little extra so the last letter never touches the edge.
  return (measure.measureText(text).width / 100) * 1.06;
}
