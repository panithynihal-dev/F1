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

const DRIVERS: Record<string, FlowPalette> = {
  antonelli: { base: '#F3F3F1', accents: ['#4FB3FF', '#E2283A', '#1FA65A'] },
  norris: { base: '#E4FF1A', accents: ['#FF8000', '#FFFFFF', '#FF9F2E'] },
  max_verstappen: { base: '#2F5BEA', accents: ['#E2231A', '#FFB000', '#5C86FF'] },
  hadjar: { base: '#FFD21F', accents: ['#8A4DFF', '#4A4E5A', '#FFE766'] },
};

const TEAMS: Record<string, FlowPalette> = {
  mercedes: { base: '#C9D1DA', accents: ['#6E8FB5', '#EEF2F6', '#00D7B6'] },
};

/** A fallback built from a team's colour, so anyone without a palette still gets a moving fill. */
function fromTeamColour(teamName?: string | null): FlowPalette {
  const c = teamBrand(teamName).color;
  return { base: '#F3F3F1', accents: [c, '#F3F3F1', c] };
}

/** OpenF1 knows drivers by three-letter acronym, Jolpica by driverId; this bridges the two. */
const BY_CODE: Record<string, string> = { ANT: 'antonelli', NOR: 'norris', VER: 'max_verstappen', HAD: 'hadjar' };
export const paletteForCode = (code?: string | null, teamName?: string | null) => driverPalette(code ? BY_CODE[code] : null, teamName);

export function driverPalette(driverId?: string | null, teamName?: string | null): FlowPalette {
  return (driverId && DRIVERS[driverId]) || fromTeamColour(teamName);
}

export function teamPalette(constructorId?: string | null, teamName?: string | null): FlowPalette {
  return (constructorId && TEAMS[constructorId]) || fromTeamColour(teamName ?? constructorId);
}
