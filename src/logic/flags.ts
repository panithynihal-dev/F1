import { fromHelmet, type FlowPalette, type Helmet } from './helmets';

// Race names on the Home hero flow in the host country's flag colours (three, most-used first),
// the same way driver names flow in their helmet colours. Keyed by Jolpica's
// Circuit.Location.country. Dark flag colours are lifted so the letters still read on the dark page.

const FLAGS: Record<string, Helmet> = {
  Australia: ['#2F5BEA', '#F3F3F1', '#E2231A'], // blue, white, red
  Austria: ['#E2231A', '#F3F3F1', '#FF5A5A'], // red, white
  Azerbaijan: ['#00B5E2', '#E2231A', '#1FA65A'], // blue, red, green
  Bahrain: ['#E2231A', '#F3F3F1', '#FF5A5A'], // red, white
  Belgium: ['#FFD21F', '#E2231A', '#6C727C'], // yellow, red, black lifted to graphite
  Brazil: ['#1FA65A', '#FFD21F', '#2F5BEA'], // green, yellow, blue
  Canada: ['#E2231A', '#F3F3F1', '#FF5A5A'], // red, white
  China: ['#E2231A', '#FFD21F', '#FF5A5A'], // red, yellow
  France: ['#2F5BEA', '#F3F3F1', '#E2231A'], // blue, white, red
  Germany: ['#FFCC00', '#E2231A', '#6C727C'], // gold, red, black lifted to graphite
  Hungary: ['#E2231A', '#F3F3F1', '#1FA65A'], // red, white, green
  Italy: ['#1FA65A', '#F3F3F1', '#E2231A'], // green, white, red
  Japan: ['#F3F3F1', '#E2231A', '#F3F3F1'], // white, red
  Malaysia: ['#2F5BEA', '#E2231A', '#FFD21F'], // blue, red, yellow
  Mexico: ['#1FA65A', '#F3F3F1', '#E2231A'], // green, white, red
  Monaco: ['#E2231A', '#F3F3F1', '#FF5A5A'], // red, white
  Netherlands: ['#FF7A00', '#E2231A', '#2F5BEA'], // Dutch orange, red, blue
  Portugal: ['#1FA65A', '#E2231A', '#FFD21F'], // green, red, yellow
  Qatar: ['#B8325A', '#F3F3F1', '#8A1538'], // maroon lifted, white
  'Saudi Arabia': ['#1FA65A', '#F3F3F1', '#1FA65A'], // green, white
  Singapore: ['#E2231A', '#F3F3F1', '#FF5A5A'], // red, white
  Spain: ['#E2231A', '#FFD21F', '#FF5A5A'], // red, yellow
  UAE: ['#E2231A', '#1FA65A', '#F3F3F1'], // red, green, white
  UK: ['#2F5BEA', '#E2231A', '#F3F3F1'], // blue, red, white
  USA: ['#E2231A', '#F3F3F1', '#2F5BEA'], // red, white, blue
};

/** A new venue we don't know yet: the site's red and white. */
const FALLBACK: Helmet = ['#F3F3F1', '#E10600', '#F3F3F1'];

const PALETTES: Record<string, FlowPalette> = Object.fromEntries(Object.entries(FLAGS).map(([country, flag]) => [country, fromHelmet(flag)]));
const FALLBACK_PALETTE = fromHelmet(FALLBACK);

/** OpenF1 spells a few countries out where Jolpica abbreviates them. */
const ALIASES: Record<string, string> = {
  'United States': 'USA',
  'United Kingdom': 'UK',
  'Great Britain': 'UK',
  'United Arab Emirates': 'UAE',
};

/** The flag palette for a host country, under either Jolpica's or OpenF1's spelling. */
export const flagPalette = (country?: string | null): FlowPalette =>
  (country && PALETTES[ALIASES[country] ?? country]) || FALLBACK_PALETTE;

/**
 * How a race name is lettered: "Las Vegas Grand Prix" → script "Las Vegas" over wide "GRAND PRIX".
 * A name that doesn't end in "Grand Prix" ("Pre-Season Testing") is written all in script.
 */
export function raceTitleParts(name: string): { script: string; wide?: string } {
  const suffix = ' Grand Prix';
  return name.endsWith(suffix) ? { script: name.slice(0, -suffix.length), wide: 'Grand Prix' } : { script: name };
}
