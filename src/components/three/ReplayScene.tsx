// Deep import: drei's index pulls in every helper it has, and Metro doesn't tree-shake.
import { Html } from '@react-three/drei/web/Html';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { hexColor } from '@/domain/teamBrand';
import { positionAt, type DriverTrack, type NormalizedPoint } from '@/domain/trackBuilder';

// Same reasoning as the home hero: true-scale gradients disappear, tripled they read as hills.
const ELEVATION_SCALE = 3;

/**
 * The replay in 3D: the circuit as a ribbon on its real elevation, a marker per car, and an orbit
 * camera. It reads the same playback clock as the 2D map, every frame, so play, pause, scrub and
 * speed all drive it unchanged. Drag to orbit, scroll to zoom, right-drag to pan.
 */
export default function ReplayScene({
  outline,
  tracks,
  clock,
  visible,
  highlighted,
}: {
  outline: NormalizedPoint[];
  tracks: DriverTrack[];
  clock: MutableRefObject<number>;
  visible: MutableRefObject<(driver: number) => boolean>;
  highlighted: MutableRefObject<number | null>;
}) {
  // Centre the circuit on the origin; x/y/z are already on one shared scale.
  const centre = useMemo(() => {
    const xs = outline.map((p) => p.x);
    const ys = outline.map((p) => p.y);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  }, [outline]);
  // OpenF1's y is north; three.js looks down -z, so north goes into the screen.
  const toWorld = useMemo(
    () => (p: NormalizedPoint, target = new THREE.Vector3()) => target.set(p.x - centre.x, (p.z ?? 0) * ELEVATION_SCALE, -(p.y - centre.y)),
    [centre],
  );

  return (
    <Canvas camera={{ position: [0, 1.05, 1.1], fov: 45, near: 0.01, far: 20 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
      <color attach="background" args={['#0E0E11']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[1, 2, 1.5]} intensity={1.2} />
      <gridHelper args={[2, 40, '#24242A', '#17171B']} position={[0, -0.003, 0]} />
      <Circuit outline={outline} toWorld={toWorld} />
      {tracks.map((track) => (
        <Car key={track.driverNumber} track={track} toWorld={toWorld} clock={clock} visible={visible} highlighted={highlighted} />
      ))}
      <Orbit />
    </Canvas>
  );
}

/**
 * three.js's own orbit controls, attached directly. drei's wrapper would do the same but drags in
 * the whole of three-stdlib (fonts, loaders, area lights) through its barrel export.
 */
function Orbit() {
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const controls = useMemo(() => {
    const c = new OrbitControls(camera, dom);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = 0.25;
    c.maxDistance = 2.5;
    // Never under the floor.
    c.maxPolarAngle = Math.PI / 2.15;
    return c;
  }, [camera, dom]);
  useEffect(() => () => controls.dispose(), [controls]);
  useFrame(() => controls.update());
  return null;
}

function Circuit({ outline, toWorld }: { outline: NormalizedPoint[]; toWorld: (p: NormalizedPoint) => THREE.Vector3 }) {
  const { tube, shadow } = useMemo(() => {
    const step = Math.max(1, Math.floor(outline.length / 400));
    const curve = new THREE.CatmullRomCurve3(
      outline.filter((_, i) => i % step === 0).map((p) => toWorld(p)),
      true,
      'centripetal',
    );
    const flat = curve.getSpacedPoints(800).map((v) => new THREE.Vector3(v.x, -0.002, v.z));
    return {
      tube: new THREE.TubeGeometry(curve, 900, 0.011, 8, true),
      shadow: new THREE.BufferGeometry().setFromPoints(flat),
    };
  }, [outline, toWorld]);
  return (
    <group>
      <lineLoop geometry={shadow}>
        <lineBasicMaterial color="#3C3C42" />
      </lineLoop>
      <mesh geometry={tube}>
        <meshStandardMaterial color="#5A5A66" roughness={0.75} metalness={0.05} />
      </mesh>
    </group>
  );
}

function Car({
  track,
  toWorld,
  clock,
  visible,
  highlighted,
}: {
  track: DriverTrack;
  toWorld: (p: NormalizedPoint, target?: THREE.Vector3) => THREE.Vector3;
  clock: MutableRefObject<number>;
  visible: MutableRefObject<(driver: number) => boolean>;
  highlighted: MutableRefObject<number | null>;
}) {
  const group = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const hint = useRef({ index: 1 });
  const colour = hexColor(track.teamColour) ?? '#808080';

  useFrame(() => {
    const node = group.current;
    if (!node) return;
    const shown = visible.current(track.driverNumber);
    node.visible = shown;
    if (!shown) return;
    const p = positionAt(track.points, clock.current, hint.current);
    if (p) toWorld(p, node.position).y += 0.016;
    const focus = highlighted.current;
    const isFocus = focus === track.driverNumber;
    node.scale.setScalar(isFocus ? 1.7 : focus != null ? 0.85 : 1);
    if (label.current) label.current.style.opacity = isFocus ? '1' : '0';
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.55} roughness={0.4} />
      </mesh>
      {/* A thin stalk to the ground, so a car's height on a climb is readable from any angle. */}
      <mesh position={[0, -0.008, 0]}>
        <cylinderGeometry args={[0.0012, 0.0012, 0.016, 6]} />
        <meshBasicMaterial color={colour} />
      </mesh>
      <Html center distanceFactor={0.9} position={[0, 0.03, 0]} style={{ pointerEvents: 'none' }}>
        <div
          ref={label}
          style={{
            opacity: 0,
            transition: 'opacity 150ms',
            background: 'rgba(10,10,12,0.88)',
            border: `1px solid ${colour}`,
            borderRadius: 6,
            padding: '2px 8px',
            color: '#FFFFFF',
            fontFamily: 'Barlow_700Bold, sans-serif',
            fontSize: 13,
            whiteSpace: 'nowrap',
          }}
        >
          {track.acronym}
        </div>
      </Html>
    </group>
  );
}
