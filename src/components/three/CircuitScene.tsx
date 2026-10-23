import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { CircuitPoint } from '@/data/circuitShape';

// Real gradients are a few percent of a circuit's length; drawn true to scale they vanish. Tripled,
// Spa's climb and COTA's turn 1 read as hills without the track turning into a rollercoaster.
const ELEVATION_SCALE = 3;
const LAP_SECONDS = 9;

/**
 * The next circuit as a lit ribbon floating over a faint grid, turning slowly, with one point of
 * light running a lap so the direction of travel is visible. Built from a real lap's telemetry,
 * elevation included. Decorative: the page states everything it shows in text.
 */
export default function CircuitScene({ points, reducedMotion }: { points: CircuitPoint[]; reducedMotion: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0.62, 0.95], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      aria-hidden
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[1, 2, 1]} intensity={1.1} />
      <Track points={points} reducedMotion={reducedMotion} />
    </Canvas>
  );
}

function Track({ points, reducedMotion }: { points: CircuitPoint[]; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const runner = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => {
    // Every few samples is plenty for a smooth curve and keeps the tube light.
    const step = Math.max(1, Math.floor(points.length / 260));
    const vectors = points.filter((_, i) => i % step === 0).map((p) => new THREE.Vector3(p.x, p.y * ELEVATION_SCALE, p.z));
    return new THREE.CatmullRomCurve3(vectors, true, 'centripetal');
  }, [points]);

  const tube = useMemo(() => new THREE.TubeGeometry(curve, 600, 0.0085, 10, true), [curve]);
  // The shadow on the floor: the same line flattened, so the height of each section is legible.
  const shadow = useMemo(() => {
    const flat = curve.getSpacedPoints(600).map((v) => new THREE.Vector3(v.x, -0.002, v.z));
    return new THREE.BufferGeometry().setFromPoints(flat);
  }, [curve]);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    if (group.current) group.current.rotation.y += delta * 0.12;
    if (runner.current) {
      const t = (state.clock.elapsedTime / LAP_SECONDS) % 1;
      runner.current.position.copy(curve.getPointAt(t));
    }
  });

  return (
    <group ref={group} rotation={[0, -0.6, 0]} position={[0, -0.08, 0]}>
      <gridHelper args={[1.6, 32, '#2A2A30', '#18181C']} position={[0, -0.004, 0]} />
      <lineLoop geometry={shadow}>
        <lineBasicMaterial color="#3C3C42" />
      </lineLoop>
      <mesh geometry={tube}>
        <meshStandardMaterial color="#E10600" emissive="#B30000" emissiveIntensity={0.9} roughness={0.35} metalness={0.2} />
      </mesh>
      {reducedMotion ? null : (
        <mesh ref={runner}>
          <sphereGeometry args={[0.018, 16, 16]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      )}
    </group>
  );
}
