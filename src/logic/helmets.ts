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

export type Helmet = [main: string, second: string, third: string];

/** Three helmet colours, most-used first. The third swirl re-uses the main colour, so only these three show. */
export const fromHelmet =([main, second, third]: Helmet): FlowPalette => ({ base: main, accents: [second, third, main] });

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

// Team colours: the three used most on each 2026 livery, most-used first, for constructor names.
// Black and carbon are lifted to graphite so the letters still read on the dark page.
const TEAM_COLOURS: Record<string, Helmet> = {
  mercedes: ['#C9D1DA', '#00D7B6', '#F3F3F1'], // silver, Petronas teal, white
  ferrari: ['#ED1131', '#F3F3F1', '#FFD21F'], // Ferrari red, white, yellow
  red_bull: ['#4781D7', '#E2231A', '#FFD21F'], // blue, red, yellow
  mclaren: ['#FF8000', '#6C727C', '#47C7FC'], // papaya, black lifted to graphite, sky blue
  rb: ['#F3F3F1', '#6C98FF', '#E2231A'], // white, blue, red
  alpine: ['#00A1E8', '#FF87BC', '#F3F3F1'], // blue, pink, white
  haas: ['#F3F3F1', '#E6002B', '#8E949D'], // white, red, grey
  audi: ['#C9D1DA', '#F50537', '#6C727C'], // titanium, Audi red, black lifted to graphite
  williams: ['#1868DB', '#F3F3F1', '#00A3E0'], // Williams blue, white, light blue
  aston_martin: ['#229971', '#CEDC00', '#F3F3F1'], // racing green, lime, white
  cadillac: ['#E8ECF0', '#6C727C', '#C9A44A'], // white, black lifted to graphite, gold
};
/**
 * Team names lean on their main livery colour (Ferrari mostly red). The letters sit in the main
 * colour and it also carries most swirls: the pointer alternates the first two swirl colours and
 * the ambient swirls use them 85% of the time, so main + second do the moving and the third is a hint.
 */
const fromLivery = ([main, second, third]: Helmet): FlowPalette => ({ base: main, accents: [main, second, third] });
const TEAMS: Record<string, FlowPalette> = Object.fromEntries(
  Object.entries(TEAM_COLOURS).map(([id, colours]) => [id, fromLivery(colours)]),
);

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
