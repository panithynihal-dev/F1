// Port of the app's util/TeamBrand.kt. OpenF1 carries an exact team_colour per driver and should be
// preferred wherever it is available; Jolpica has no colour at all, so this palette (captured from
// OpenF1's live data for the current grid) fills that gap. Teams are matched by substring of the
// lowercased name, the one thing both APIs' names have in common.

export interface Livery {
  /** The tile's ground. */
  background: string;
  /** The stripe and number drawn on it. */
  ink: string;
}

export interface TeamInfo {
  abbreviation: string;
  color: string;
  livery: Livery;
}

const WHITE = '#FFFFFF';
const BLACK = '#0A0A0A';
const RACE_RED = '#E6002B';

// Every pair was contrast-checked in the app. McLaren's papaya-and-white and Racing Bulls'
// blue-on-white sit under 3:1 and are kept anyway, because that is how those cars look.
const teams: { key: string; abbreviation: string; color: string; livery: Livery }[] = [
  { key: 'mercedes', abbreviation: 'MER', color: '#00D7B6', livery: { background: BLACK, ink: '#00D7B6' } },
  { key: 'ferrari', abbreviation: 'FER', color: '#ED1131', livery: { background: '#ED1131', ink: WHITE } },
  { key: 'mclaren', abbreviation: 'MCL', color: '#F47600', livery: { background: '#F47600', ink: WHITE } },
  { key: 'red bull', abbreviation: 'RBR', color: '#4781D7', livery: { background: '#4781D7', ink: WHITE } },
  // Deep navy rather than Alpine's brighter blue: the pink is what makes the tile theirs.
  { key: 'alpine', abbreviation: 'ALP', color: '#00A1E8', livery: { background: '#041E42', ink: '#FF87BC' } },
  { key: 'haas', abbreviation: 'HAA', color: '#9C9FA2', livery: { background: WHITE, ink: RACE_RED } },
  { key: 'williams', abbreviation: 'WIL', color: '#1868DB', livery: { background: BLACK, ink: '#1868DB' } },
  { key: 'audi', abbreviation: 'AUD', color: '#F50537', livery: { background: '#DDE1E3', ink: RACE_RED } },
  { key: 'sauber', abbreviation: 'SAU', color: '#01C00E', livery: { background: BLACK, ink: '#01C00E' } },
  { key: 'aston martin', abbreviation: 'AM', color: '#229971', livery: { background: '#229971', ink: BLACK } },
  { key: 'cadillac', abbreviation: 'CAD', color: '#909090', livery: { background: WHITE, ink: BLACK } },
];

const racingBulls: TeamInfo = { abbreviation: 'RB', color: '#6C98FF', livery: { background: WHITE, ink: '#6C98FF' } };
const unknownLivery: Livery = { background: '#3A3A40', ink: WHITE };

export function teamBrand(teamName?: string | null): TeamInfo {
  const name = (teamName ?? '').toLowerCase();
  // OpenF1 says "Racing Bulls", Jolpica "RB F1 Team" — neither contains the other.
  if (name.includes('racing bulls') || name.startsWith('rb ') || name === 'rb') return racingBulls;
  const match = teams.find((team) => name.includes(team.key));
  if (match) return match;
  return { abbreviation: name.slice(0, 3).toUpperCase() || '?', color: '#808080', livery: unknownLivery };
}

/** OpenF1's team_colour arrives without the hash ("E8002D"). */
export const hexColor = (hex?: string | null) => (hex && /^[0-9a-f]{6}$/i.test(hex) ? `#${hex}` : null);
