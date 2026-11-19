import { useEffect, useRef, type CSSProperties } from 'react';

import { fluid, fluidNames, useFluidActive } from '@/components/fluid/registry';
import type { FlowPalette } from '@/logic/helmets';

const FONTS = {
  // The italic leans past the box on the right; a little room keeps the last letter's colour.
  title: { fontFamily: 'BarlowCondensed_800ExtraBold_Italic', textTransform: 'uppercase', paddingRight: '0.08em' },
  // Script swashes reach well outside the text box, and the colour is clipped to that box, so the
  // box is padded out and pulled back with a negative margin (the layout doesn't move). The left
  // margin pulls back a little less, so opening swashes (the "L" of Lando) don't hang off the edge.
  signature: { fontFamily: 'MrDafoe_400Regular', textTransform: 'none', wordSpacing: '0.2em', padding: '0.3em', margin: '-0.3em -0.3em -0.3em -0.15em' },
  wide: { fontFamily: 'Unbounded_800ExtraBold', textTransform: 'uppercase', letterSpacing: '-0.01em' },
} satisfies Record<string, CSSProperties>;

/**
 * A name in its owner's helmet (or team) colours, moving like liquid.
 *
 * By default the colours drift slowly through the letters (the `.tm-helmet` rule in global.css).
 * With `fluid` (the Home hero and driver page headers) the shared fluid simulation in components/fluid paints
 * it instead: the colours swirl inside crisp, still letters and the mouse stirs them. The real text stays in
 * the page (transparent) for layout, selection and screen readers. If the simulation can't run
 * (reduced motion, no WebGL), a fluid name falls back to the CSS drift too.
 */
export function HelmetText({
  children,
  palette,
  size,
  lineHeight = 0.92,
  as: Tag = 'span',
  className = '',
  fluid: wantsFluid = false,
  still = false,
  font = 'title',
}: {
  children: string;
  palette: FlowPalette;
  size: number;
  lineHeight?: number;
  as?: 'span' | 'h1' | 'h2' | 'h3';
  className?: string;
  /** Paint this name with the live fluid simulation (the Home hero and driver page headers). */
  fluid?: boolean;
  /** Keep the colours but hold them still (no drift, no fluid). */
  still?: boolean;
  /** title =the site's condensed italic caps; signature = brush script first name; wide = heavy wide caps surname. */
  font?: keyof typeof FONTS;
}) {
  const ref = useRef<HTMLElement>(null);
  const fluidOn = useFluidActive() && wantsFluid;

  // Sign up with the fluid simulation for as long as the name is on the page.
  useEffect(() => {
    const el = ref.current;
    if (!el || !wantsFluid) return;
    const entry = { el, palette };
    fluidNames.add(entry);
    fluid.bump();
    return () => {
      fluidNames.delete(entry);
      fluid.bump();
    };
  }, [palette, wantsFluid]);

  const [a, b, c] = palette.accents;
  // CSS fallback: the first two accents are the helmet's main colours, the third only a hint.
  // Patches are sized in em, so a 30px podium name and a 120px headline get the same mix.
  const blob = (col: string, x: string, y: string, w: number, h: number) => `radial-gradient(ellipse ${w}em ${h}em at ${x} ${y}, ${col} 0%, ${col} 35%, ${col}00 100%)`;
  const style = {
    ...(fluidOn
      ? { color: 'transparent', WebkitTextFillColor: 'transparent' }
      : {
          '--hf-base': palette.base,
          '--hf-a': blob(a, '30%', '35%', 1.5, 0.9),
          '--hf-b': blob(b, '70%', '65%', 1.2, 0.8),
          '--hf-c': blob(c, '45%', '80%', 0.6, 0.4),
        }),
    fontSize: size,
    lineHeight,
    display: 'block',
    whiteSpace: 'pre-line',
    margin: 0,
    ...FONTS[font],
  } as CSSProperties;
  return (
    <Tag ref={ref as never} className={`${fluidOn ? '' : 'tm-helmet'} ${still ? 'tm-helmet-still' : ''} ${className}`} style={style}>
      {children}
    </Tag>
  );
}
