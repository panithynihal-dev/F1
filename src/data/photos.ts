// Free-licence photos (Wikimedia Commons), bundled as compressed WebP in assets/photos. Every photo
// shows its credit line wherever it appears; assets/photos/CREDITS.md lists each file's source page.
// Photos exist only for some circuits, drivers and teams, so every lookup can come back empty and
// every caller has a layout without one. To add one: save the WebP, add a line below, add it to
// CREDITS.md.

export interface Photo {
  source: number;
  credit: string;
  /** CSS object-position for where the subject sits, e.g. '50% 40%'. */
  focus?: string;
}

const CIRCUITS: Record<string, Photo> = {
  losail: { source: require('../../assets/photos/circuit-losail.webp'), credit: 'Photo: Trinidade, CC BY-SA 3.0, via Wikimedia Commons', focus: '50% 40%' },
  vegas: { source: require('../../assets/photos/circuit-vegas.webp'), credit: 'Photo: U.S. Department of Homeland Security, public domain, via Wikimedia Commons', focus: '50% 55%' },
  yas_marina: { source: require('../../assets/photos/circuit-yas-marina.webp'), credit: 'Photo: Cesar I. Martins, CC BY 2.0, via Wikimedia Commons', focus: '50% 70%' },
};

/** Drivers celebrating (podium, trophy, champagne). */
const CELEBRATIONS: Record<string, Photo> = {
  antonelli: { source: require('../../assets/photos/celebrate-antonelli.webp'), credit: 'Photo: Liauzh, CC BY 4.0, via Wikimedia Commons', focus: '40% 30%' },
  hadjar: { source: require('../../assets/photos/celebrate-hadjar.webp'), credit: 'Photo: Lukas Raich, CC BY-SA 4.0, via Wikimedia Commons', focus: '45% 30%' },
  leclerc: { source: require('../../assets/photos/celebrate-leclerc.webp'), credit: 'Photo: Yu Chu Chin, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 30%' },
  max_verstappen: { source: require('../../assets/photos/celebrate-verstappen.webp'), credit: 'Photo: Governo do Estado de São Paulo, CC BY 2.0, via Wikimedia Commons', focus: '50% 25%' },
  norris: { source: require('../../assets/photos/celebrate-norris.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '30% 35%' },
  russell: { source: require('../../assets/photos/celebrate-russell.webp'), credit: 'Photo: Yu Chu Chin, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 30%' },
};

/** Drivers off track (walkabouts, interviews), for when there's no celebration photo. */
const PORTRAITS: Record<string, Photo> = {
  albon: { source: require('../../assets/photos/portrait-albon.webp'), credit: 'Photo: Yu Chu Chin, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 28%' },
  arvid_lindblad: { source: require('../../assets/photos/portrait-lindblad.webp'), credit: 'Photo: Yu Chu Chin, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 28%' },
  bearman: { source: require('../../assets/photos/portrait-bearman.webp'), credit: 'Photo: Liauzh, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 28%' },
  bortoleto: { source: require('../../assets/photos/portrait-bortoleto.webp'), credit: 'Photo: Yu Chu Chin, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 28%' },
  bottas: { source: require('../../assets/photos/portrait-bottas.webp'), credit: 'Photo: Yu Chu Chin, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 28%' },
  colapinto: { source: require('../../assets/photos/portrait-colapinto.webp'), credit: 'Photo: Yu Chu Chin, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 28%' },
  hulkenberg: { source: require('../../assets/photos/portrait-hulkenberg.webp'), credit: 'Photo: Liauzh, CC BY 4.0, via Wikimedia Commons', focus: '50% 28%' },
  piastri: { source: require('../../assets/photos/portrait-piastri.webp'), credit: 'Photo: Liauzh, CC BY 4.0, via Wikimedia Commons', focus: '50% 28%' },
  stroll: { source: require('../../assets/photos/portrait-stroll.webp'), credit: 'Photo: Liauzh, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 28%' },
  tsunoda: { source: require('../../assets/photos/portrait-tsunoda.webp'), credit: 'Photo: Yu Chu Chin, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 28%' },
};

/** Drivers in their current car. */
const ACTION: Record<string, Photo> = {
  alonso: { source: require('../../assets/photos/action-alonso.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  antonelli: { source: require('../../assets/photos/action-antonelli.webp'), credit: 'Photo: Liauzh, CC BY-SA 4.0, via Wikimedia Commons', focus: '70% 50%' },
  gasly: { source: require('../../assets/photos/action-gasly.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  hamilton: { source: require('../../assets/photos/action-hamilton.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  lawson: { source: require('../../assets/photos/action-lawson.webp'), credit: 'Photo: Liauzh, CC BY 4.0, via Wikimedia Commons', focus: '50% 55%' },
  norris: { source: require('../../assets/photos/action-norris.webp'), credit: 'Photo: Liauzh, CC BY 4.0, via Wikimedia Commons', focus: '65% 50%' },
  ocon: { source: require('../../assets/photos/action-ocon.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  perez: { source: require('../../assets/photos/action-perez.webp'), credit: 'Photo: Liauzh, CC BY 4.0, via Wikimedia Commons', focus: '50% 55%' },
  rafael_camara: { source: require('../../assets/photos/action-camara.webp'), credit: 'Photo: Lukas Raich, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  ryo_hirakawa: { source: require('../../assets/photos/action-hirakawa.webp'), credit: 'Photo: Lukas Raich, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  sainz: { source: require('../../assets/photos/action-sainz.webp'), credit: 'Photo: Liauzh, CC BY 4.0, via Wikimedia Commons', focus: '50% 55%' },
};

/** Each team's current car, for the team page header. */
const TEAMS: Record<string, Photo> = {
  mercedes: ACTION.antonelli,
  alpine: { source: require('../../assets/photos/team-alpine.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  aston_martin: { source: require('../../assets/photos/team-aston-martin.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  audi: { source: require('../../assets/photos/team-audi.webp'), credit: 'Photo: Liauzh, CC BY 4.0, via Wikimedia Commons', focus: '50% 55%' },
  cadillac: { source: require('../../assets/photos/team-cadillac.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  ferrari: { source: require('../../assets/photos/team-ferrari.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  haas: { source: require('../../assets/photos/team-haas.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  mclaren: { source: require('../../assets/photos/team-mclaren.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  rb: { source: require('../../assets/photos/team-rb.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  red_bull: { source: require('../../assets/photos/team-red-bull.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
  williams: { source: require('../../assets/photos/team-williams.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '50% 55%' },
};

export const circuitPhoto = (circuitId?: string | null) => (circuitId ? CIRCUITS[circuitId] : undefined);
/** Podium cards: a celebration if there is one, otherwise a portrait, otherwise the car. */
export const celebrationPhoto = (driverId?: string | null) =>
  driverId ? (CELEBRATIONS[driverId] ?? PORTRAITS[driverId] ?? ACTION[driverId]) : undefined;
/** Driver headers and the last-race slide: the car if there is one, otherwise any photo of them. */
export const actionPhoto = (driverId?: string | null) =>
  driverId ? (ACTION[driverId] ?? CELEBRATIONS[driverId] ?? PORTRAITS[driverId]) : undefined;
export const teamPhoto = (constructorId?: string | null) => (constructorId ? TEAMS[constructorId] : undefined);
