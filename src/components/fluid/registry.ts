import { useSyncExternalStore } from 'react';

import type { FlowPalette } from '@/logic/helmets';

// The list of helmet-colour names on screen, shared between the names (HelmetText) and the one
// fluid simulation that paints them (FluidField). Names sign up here; the simulation reads them.

export interface FluidName {
  el: HTMLElement;
  palette: FlowPalette;
}

export const fluidNames = new Set<FluidName>();

let active = false;
let version = 0;
const listeners = new Set<() => void>();

export const fluid = {
  /** True once the simulation is running and painting names; until then names use the CSS gradient. */
  get active() {
    return active;
  },
  setActive(next: boolean) {
    if (next === active) return;
    active = next;
    listeners.forEach((l) => l());
  },
  /** Bumped whenever a name joins or leaves, so the simulation knows to redraw its text mask. */
  get version() {
    return version;
  },
  bump() {
    version++;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Whether names should hand their colour over to the fluid simulation. */
export function useFluidActive() {
  return useSyncExternalStore(fluid.subscribe, () => active, () => false);
}
