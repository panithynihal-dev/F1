// Free-licence photos (Wikimedia Commons), bundled as compressed WebP. Every photo carries its credit
// line wherever it appears; see the Obsidian vault note "Photo credits" for the source files.
// Photos exist only for some circuits and drivers, so every lookup can come back empty and every
// caller has a layout without one.

export interface Photo {
  source: number;
  credit: string;
  /** CSS object-position for where the subject sits, e.g. '50% 40%'. */
  focus?: string;
}

const LIAUZH_BY = 'Photo: Liauzh, CC BY 4.0, via Wikimedia Commons';

const CIRCUITS: Record<string, Photo> = {
  vegas: { source: require('../../assets/photos/circuit-vegas.webp'), credit: 'Photo: U.S. Department of Homeland Security, public domain, via Wikimedia Commons', focus: '50% 55%' },
  losail: { source: require('../../assets/photos/circuit-losail.webp'), credit: 'Photo: Trinidade, CC BY-SA 3.0, via Wikimedia Commons', focus: '50% 40%' },
  yas_marina: { source: require('../../assets/photos/circuit-yas-marina.webp'), credit: 'Photo: Cesar I. Martins, CC BY 2.0, via Wikimedia Commons', focus: '50% 70%' },
};

/** Drivers celebrating: podium cards and the champion / winner slides. */
const CELEBRATIONS: Record<string, Photo> = {
  antonelli: { source: require('../../assets/photos/celebrate-antonelli.webp'), credit: LIAUZH_BY, focus: '40% 30%' },
  norris: { source: require('../../assets/photos/celebrate-norris.webp'), credit: 'Photo: Steffen Prößdorf, CC BY-SA 4.0, via Wikimedia Commons', focus: '30% 35%' },
  max_verstappen: { source: require('../../assets/photos/celebrate-verstappen.webp'), credit: 'Photo: Governo do Estado de São Paulo, CC BY 2.0, via Wikimedia Commons', focus: '50% 25%' },
  hadjar: { source: require('../../assets/photos/celebrate-hadjar.webp'), credit: 'Photo: Lukas Raich, CC BY-SA 4.0, via Wikimedia Commons', focus: '45% 30%' },
};

/** Drivers in the car: driver page headers and the last-race slide. */
const ACTION: Record<string, Photo> = {
  antonelli: { source: require('../../assets/photos/action-antonelli.webp'), credit: 'Photo: Liauzh, CC BY-SA 4.0, via Wikimedia Commons', focus: '70% 50%' },
  norris: { source: require('../../assets/photos/action-norris.webp'), credit: LIAUZH_BY, focus: '65% 50%' },
};

const TEAMS: Record<string, Photo> = {
  mercedes: ACTION.antonelli,
};

export const circuitPhoto = (circuitId?: string | null) => (circuitId ? CIRCUITS[circuitId] : undefined);
export const celebrationPhoto = (driverId?: string | null) => (driverId ? CELEBRATIONS[driverId] : undefined);
export const actionPhoto = (driverId?: string | null) => (driverId ? ACTION[driverId] ?? CELEBRATIONS[driverId] : undefined);
export const teamPhoto = (constructorId?: string | null) => (constructorId ? TEAMS[constructorId] : undefined);
