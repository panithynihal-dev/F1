import type { CSSProperties } from 'react';

import type { FlowPalette } from '@/domain/helmets';

/**
 * A name filled with its owner's helmet (or team) colours that drift slowly through the letters.
 * Web only: React Native's Text has no background-clip, so this is a plain span styled by the
 * `.tm-helmet` rule in global.css. It holds still under reduced motion.
 */
export function HelmetText({
  children,
  palette,
  size,
  lineHeight = 0.92,
  as: Tag = 'span',
  className = '',
}: {
  children: string;
  palette: FlowPalette;
  size: number;
  lineHeight?: number;
  as?: 'span' | 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  const [a, b, c] = palette.accents;
  // The first two accents are the helmet's main colours; the third is only a hint, so it stays small.
  // Patches are sized in em, so a 30px podium name and a 120px headline get the same mix.
  const blob = (col: string, x: string, y: string, w: number, h: number) => `radial-gradient(ellipse ${w}em ${h}em at ${x} ${y}, ${col} 0%, ${col} 35%, ${col}00 100%)`;
  const style = {
    '--hf-base': palette.base,
    '--hf-a': blob(a, '30%', '35%', 1.5, 0.9),
    '--hf-b': blob(b, '70%', '65%', 1.2, 0.8),
    '--hf-c': blob(c, '45%', '80%', 0.6, 0.4),
    fontFamily: 'BarlowCondensed_800ExtraBold_Italic',
    fontSize: size,
    lineHeight,
    textTransform: 'uppercase',
    display: 'block',
    whiteSpace: 'pre-line',
    margin: 0,
    // The italic leans past the box on the right; a little room keeps the last letter's colour.
    paddingRight: '0.08em',
  } as CSSProperties;
  return (
    <Tag className={`tm-helmet ${className}`} style={style}>
      {children}
    </Tag>
  );
}
