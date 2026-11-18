import { teamBrand } from './teamBrand';

// Helmet flow palettes: a champion's or winner's name is filled with their own helmet colours,
// and a constructor's with its team colours, instead of a generic gold. Each driver gets the three
// colours used most on their main 2026 helmet (one-off specials ignored), so the swirl reads as
// their helmet. Near-black is lifted to graphite so the text still reads on the dark page. Keyed by
// Jolpica driverId / constructorId.

export interface FlowPalette {
  /** The colour most of the letters sit in. */
  base: string;
  /** Up to three colours that drift through it. */
  accents: [string, string, string];
}

type Helmet = [main: string, second: string, third: string];

/** Three helmet colours, most-used first. The third swirl re-uses the main colour, so only these three show. */
const fromHelmet = ([main, second, third]: Helmet): FlowPalette => ({ base: main, accents: [second, third, main] });

const HELMETS: Record<string, Helmet> = {
  // Mercedes
  antonelli: ['#F3F3F1', '#4FB3FF', '#E2283A'], // white, sky blue, Italian red
  russell: ['#BFE4F7', '#3FA9E0', '#F3F3F1'], // ice blue, blue, white
  // Red Bull
  max_verstappen: ['#2F5BEA', '#E2231A', '#FFB000'], // blue, red, orange
  hadjar: ['#FFD21F', '#8A4DFF', '#F3F3F1'], // yellow, purple, white
  // Ferrari
  hamilton: ['#E10600', '#FFE01A', '#F3F3F1'], // red, yellow, white
  leclerc: ['#E2231A', '#F3F3F1', '#8EC9F0'], // red, white, light blue
  // McLaren
  norris: ['#E4FF1A', '#FF8000', '#F3F3F1'], // fluorescent yellow, papaya, white
  piastri: ['#2F6FDB', '#E2231A', '#F5E11A'], // blue, red, yellow
  // Racing Bulls
  lawson: ['#F3F3F1', '#F06AA6', '#C9D1DA'], // white, pink, silver
  arvid_lindblad: ['#F3F3F1', '#6C98FF', '#E2231A'], // no published helmet: team colours
  tsunoda: ['#F3F3F1', '#E2231A', '#FF8000'], // white, red, orange
  // Alpine
  gasly: ['#5BB8F5', '#2F5BEA', '#F3F3F1'], // light blue, blue, white
  colapinto: ['#75AADB', '#F3F3F1', '#F6B40E'], // Argentine sky blue, white, sun yellow
  // Haas
  bearman: ['#2F5BEA', '#C6FF1A', '#F3F3F1'], // blue, neon, white
  ocon: ['#E2231A', '#F3F3F1', '#2F5BEA'], // red, white, blue
  // Audi
  hulkenberg: ['#F3F3F1', '#C9D1DA', '#F05A28'], // white, silver, orange-red
  bortoleto: ['#1FA65A', '#FFD21F', '#2F5BEA'], // Brazil green, yellow, blue
  // Aston Martin
  alonso: ['#3A8DDE', '#E2231A', '#FFD21F'], // blue, red, yellow
  stroll: ['#A9B0BA', '#229971', '#CEDC00'], // black lifted to grey, team green, lime
  // Williams
  sainz: ['#E2231A', '#FFD21F', '#1868DB'], // red, yellow, Williams blue
  albon: ['#E8ECF0', '#AEB6C0', '#1868DB'], // white, silver, blue
  // Cadillac
  perez: ['#F3F3F1', '#3CE05A', '#E2231A'], // white, neon green, red
  bottas: ['#F3F3F1', '#2F6FDB', '#4A4E5A'], // white, blue, graphite
};
const DRIVERS: Record<string, FlowPalette> = Object.fromEntries(
  Object.entries(HELMETS).map(([id, helmet]) => [id, fromHelmet(helmet)]),
);

// Team colours from the 2026 liveries, for constructor names.
const TEAMS: Record<string, FlowPalette> = {
  mercedes: { base: '#C9D1DA', accents: ['#6E8FB5', '#EEF2F6', '#00D7B6'] },
  ferrari: { base: '#ED1131', accents: ['#F3F3F1', '#FFD21F', '#FF5A5A'] },
  red_bull: { base: '#4781D7', accents: ['#E2231A', '#FFD21F', '#2F4FA8'] },
  mclaren: { base: '#FF8000', accents: ['#4A4E5A', '#2F9BFF', '#FFB066'] },
  rb: { base: '#F3F3F1', accents: ['#6C98FF', '#E2231A', '#2F4FA8'] },
  alpine: { base: '#00A1E8', accents: ['#FF87BC', '#F3F3F1', '#2F5BEA'] },
  haas: { base: '#F3F3F1', accents: ['#E6002B', '#8E949D', '#4A4E5A'] },
  audi: { base: '#C9D1DA', accents: ['#F50537', '#F3F3F1', '#4A4E5A'] },
  williams: { base: '#1868DB', accents: ['#F3F3F1', '#00A3E0', '#5C86FF'] },
  aston_martin: { base: '#229971', accents: ['#CEDC00', '#F3F3F1', '#1C7A5A'] },
  cadillac: { base: '#E8ECF0', accents: ['#8E949D', '#4A4E5A', '#C9A44A'] },
};

/** A fallback built from a team's colour, so anyone without a palette still gets a moving fill. */
function fromTeamColour(teamName?: string | null): FlowPalette {
  const c = teamBrand(teamName).color;
  return { base: '#F3F3F1', accents: [c, '#F3F3F1', c] };
}

/** OpenF1 knows drivers by three-letter acronym, Jolpica by driverId; this bridges the two. */
const BY_CODE: Record<string, string> = {
  ANT: 'antonelli', RUS: 'russell', VER: 'max_verstappen', HAD: 'hadjar', HAM: 'hamilton', LEC: 'leclerc',
  NOR: 'norris', PIA: 'piastri', LAW: 'lawson', LIN: 'arvid_lindblad', TSU: 'tsunoda', GAS: 'gasly',
  COL: 'colapinto', BEA: 'bearman', OCO: 'ocon', HUL: 'hulkenberg', BOR: 'bortoleto', ALO: 'alonso',
  STR: 'stroll', SAI: 'sainz', ALB: 'albon', PER: 'perez', BOT: 'bottas',
};
export const paletteForCode = (code?: string | null, teamName?: string | null) => driverPalette(code ? BY_CODE[code] : null, teamName);

export function driverPalette(driverId?: string | null, teamName?: string | null): FlowPalette {
  return (driverId && DRIVERS[driverId]) || fromTeamColour(teamName);
}

export function teamPalette(constructorId?: string | null, teamName?: string | null): FlowPalette {
  return (constructorId && TEAMS[constructorId]) || fromTeamColour(teamName ?? constructorId);
}
