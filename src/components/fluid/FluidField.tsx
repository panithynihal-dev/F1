import { useEffect, useRef } from 'react';

import { hasWebGL, useReducedMotion } from '@/hooks/useReducedMotion';

import { fluid } from './registry';

/**
 * The one canvas the fluid helmet colours are painted on: fixed over the window, ignoring clicks,
 * under the nav. The simulation is loaded only after the page is up (it's a separate chunk) and
 * never under reduced motion or without WebGL; in those cases names keep their CSS gradient.
 */
export function FluidField() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !hasWebGL()) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    document.fonts.ready
      .then(() => import('./fluidSim'))
      .then(({ startFluid }) => {
        if (cancelled || !canvas.current) return;
        stop = startFluid(canvas.current, () => fluid.setActive(true));
      })
      .catch(() => fluid.setActive(false));
    return () => {
      cancelled = true;
      stop?.();
      fluid.setActive(false);
    };
  }, [reduced]);

  return <canvas ref={canvas} aria-hidden style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }} />;
}
