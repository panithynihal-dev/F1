import { teamBrand } from './teamBrand';

// Helmet flow palettes: a champion's or winner's name is filled with their own helmet colours,
// and a constructor's with its team colours, instead of a generic gold. Colours come from each
// driver's main 2026 helmet (one-off specials ignored). Near-black is lifted to graphite so the
// text still reads on the dark page. Keyed by Jolpica driverId / constructorId.

export interface FlowPalette {
  /** The colour most of the letters sit in. */
  base: string;
  /** Up to three colours that drift through it. */
  accents: [string, string, string];
}

// base = most of the letters; accents = the two main helmet colours, then a small hint.
const DRIVERS: Record<string, FlowPalette> = {
  // Mercedes
  antonelli: { base: '#F3F3F1', accents: ['#4FB3FF', '#E2283A', '#1FA65A'] }, // white, sky blue, Italian red
  russell: { base: '#BFE4F7', accents: ['#3FA9E0', '#F3F3F1', '#4A4E5A'] }, // ice blue and black
  // Red Bull
  max_verstappen: { base: '#2F5BEA', accents: ['#E2231A', '#FFB000', '#5C86FF'] }, // his dad's blue, red, orange
  hadjar: { base: '#FFD21F', accents: ['#8A4DFF', '#4A4E5A', '#FFE766'] }, // Senna yellow, purple
  // Ferrari
  hamilton: { base: '#FFE01A', accents: ['#E10600', '#8A4DFF', '#F3F3F1'] }, // neon yellow, Ferrari red, purple
  leclerc: { base: '#F3F3F1', accents: ['#E2231A', '#8EC9F0', '#B30000'] }, // Monaco red and white, baby blue
  // McLaren
  norris: { base: '#E4FF1A', accents: ['#FF8000', '#FFFFFF', '#FF9F2E'] }, // fluorescent yellow, papaya
  piastri: { base: '#2F6FDB', accents: ['#E2231A', '#F5E11A', '#FF8000'] }, // blue, red, yellow
  // Racing Bulls
  lawson: { base: '#F3F3F1', accents: ['#F06AA6', '#C9D1DA', '#6C98FF'] }, // white, pink, silver fern
  arvid_lindblad: { base: '#F3F3F1', accents: ['#6C98FF', '#E2231A', '#C9D1DA'] }, // no published helmet: team colours
  tsunoda: { base: '#F3F3F1', accents: ['#E2231A', '#FF8000', '#2F5BEA'] }, // white, red maple leaf, orange
  // Alpine
  gasly: { base: '#5BB8F5', accents: ['#2F5BEA', '#F3F3F1', '#E2231A'] }, // light and block blue, French stripe
  colapinto: { base: '#75AADB', accents: ['#F3F3F1', '#F6B40E', '#FF87BC'] }, // Argentine sky blue, white, sun
  // Haas
  bearman: { base: '#2F5BEA', accents: ['#C6FF1A', '#F3F3F1', '#6C98FF'] }, // blue, neon
  ocon: { base: '#E2231A', accents: ['#F3F3F1', '#2F5BEA', '#FF6B5E'] }, // all red, Eiffel Tower
  // Audi
  hulkenberg: { base: '#F3F3F1', accents: ['#C9D1DA', '#F05A28', '#E2231A'] }, // white, silver, orange-red
  bortoleto: { base: '#1FA65A', accents: ['#FFD21F', '#2F5BEA', '#F3F3F1'] }, // Brazil green, yellow, blue
  // Aston Martin
  alonso: { base: '#3A8DDE', accents: ['#E2231A', '#FFD21F', '#5CB8FF'] }, // Asturian blue, Spanish red and yellow
  stroll: { base: '#A9B0BA', accents: ['#229971', '#4A4E5A', '#CEDC00'] }, // black lifted to grey, team green
  // Williams
  sainz: { base: '#E2231A', accents: ['#FFD21F', '#1868DB', '#F3F3F1'] }, // red and yellow, Williams blue
  albon: { base: '#E8ECF0', accents: ['#AEB6C0', '#1868DB', '#FFFFFF'] }, // chrome white and silver
  // Cadillac
  perez: { base: '#F3F3F1', accents: ['#3CE05A', '#E2231A', '#1FA65A'] }, // neon green, Mexican flag
  bottas: { base: '#F3F3F1', accents: ['#2F6FDB', '#4A4E5A', '#C9D1DA'] }, // badger black and white, Finnish blue
};

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
