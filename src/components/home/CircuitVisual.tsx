import { useQuery } from '@tanstack/react-query';
import { Component, lazy, Suspense, useMemo, type ReactNode } from 'react';

import { getCircuitShape } from '@/data/circuitShape';
import { hasWebGL, useReducedMotion } from '@/hooks/useReducedMotion';

import { CircuitHero } from './CircuitHero';

// three.js is ~150 KB; it loads only when a hero actually needs it.
const CircuitScene = lazy(() => import('../three/scenes').then((m) => ({ default: m.CircuitScene })));

/**
 * The hero's circuit: in 3D with real elevation when a past race there gives us a lap to trace and
 * the browser has WebGL, otherwise F1's flat artwork wiped on in red. The flat version is also
 * what shows while the 3D one loads, so the hero is never empty.
 */
export function CircuitVisual({ circuitKey, imageUrl, label }: { circuitKey?: number | null; imageUrl?: string | null; label: string }) {
  const reducedMotion = useReducedMotion();
  const webgl = useMemo(() => hasWebGL(), []);
  const shape = useQuery({
    queryKey: ['circuitShape', circuitKey],
    queryFn: () => getCircuitShape(circuitKey!),
    enabled: webgl && circuitKey != null,
    staleTime: Infinity,
  });

  const flat = imageUrl ? <CircuitHero imageUrl={imageUrl} label={label} /> : null;
  if (!webgl || !shape.data) return flat;
  return (
    <div role="img" aria-label={`${label}, in 3D`} style={{ width: '100%', height: '100%' }}>
      <SceneBoundary fallback={flat}>
        <Suspense fallback={flat}>
          <CircuitScene points={shape.data} reducedMotion={reducedMotion} />
        </Suspense>
      </SceneBoundary>
    </div>
  );
}

/** A lost GPU context or a driver bug shouldn't take the home page down with it. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
