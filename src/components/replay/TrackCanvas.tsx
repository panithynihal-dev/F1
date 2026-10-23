import { useEffect, useRef, type MutableRefObject } from 'react';

import { hexColor } from '@/domain/teamBrand';
import { positionAt, type DriverTrack, type NormalizedPoint, type StartFinishLine } from '@/domain/trackBuilder';

// OpenF1's y grows northward; the screen's grows downward. Flipped so circuits read the way their
// maps do.
const FLIP_Y = true;
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const PADDING = 28;

export interface View {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * The replay map: the circuit outline, the start/finish line, and a dot per car interpolated
 * between its real samples. Drawn on a canvas every animation frame, reading the playback clock
 * from a ref so the page itself doesn't re-render sixty times a second.
 *
 * Wheel to zoom about the pointer, drag to pan, double-click to reset. Dots and labels keep a
 * constant size at every zoom, like map pins — zooming is for telling cars apart.
 */
export function TrackCanvas({
  outline,
  tracks,
  startFinish,
  clock,
  visible,
  highlighted,
  viewRef,
}: {
  outline: NormalizedPoint[];
  tracks: DriverTrack[];
  startFinish: StartFinishLine | null;
  clock: MutableRefObject<number>;
  /** Which cars are still running; a retired car keeps reporting from the gravel. */
  visible: MutableRefObject<(driver: number) => boolean>;
  highlighted: MutableRefObject<number | null>;
  viewRef: MutableRefObject<View>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const hints = new Map(tracks.map((t) => [t.driverNumber, { index: 1 }]));
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const { x: map, scale } = fit(outline.length ? outline : tracks.flatMap((t) => t.points), width, height);
      const { zoom, panX, panY } = viewRef.current;
      const toScreen = (p: NormalizedPoint) => {
        const x = map.offsetX + (p.x - map.minX) * scale;
        const y = map.offsetY + ((FLIP_Y ? map.maxY - p.y : p.y - map.minY) * scale);
        return [(x - width / 2) * zoom + width / 2 + panX, (y - height / 2) * zoom + height / 2 + panY] as const;
      };
      const strokeScale = Math.min(1.6, Math.max(0.6, Math.min(width, height) / 600)) * Math.sqrt(zoom);

      // The tarmac, then a quiet centre line along it.
      if (outline.length > 1) {
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        outline.forEach((p, i) => {
          const [x, y] = toScreen(p);
          if (i) context.lineTo(x, y);
          else context.moveTo(x, y);
        });
        context.strokeStyle = '#26262C';
        context.lineWidth = 18 * strokeScale;
        context.stroke();
        context.strokeStyle = '#3C3C42';
        context.lineWidth = 4 * strokeScale;
        context.stroke();
      }

      if (startFinish) {
        const [x, y] = toScreen(startFinish.point);
        const dx = startFinish.direction.x;
        const dy = FLIP_Y ? -startFinish.direction.y : startFinish.direction.y;
        const length = Math.hypot(dx, dy) || 1;
        const half = 13 * strokeScale;
        // Perpendicular to the direction of travel.
        const nx = (-dy / length) * half;
        const ny = (dx / length) * half;
        context.beginPath();
        context.moveTo(x - nx, y - ny);
        context.lineTo(x + nx, y + ny);
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 3;
        context.lineCap = 'butt';
        context.stroke();
      }

      const now = clock.current;
      const focus = highlighted.current;
      const isVisible = visible.current;
      // The highlighted car is drawn last so it sits on top of a bunched pack.
      const order = focus == null ? tracks : [...tracks.filter((t) => t.driverNumber !== focus), ...tracks.filter((t) => t.driverNumber === focus)];
      for (const track of order) {
        if (!isVisible(track.driverNumber)) continue;
        const position = positionAt(track.points, now, hints.get(track.driverNumber));
        if (!position) continue;
        const [x, y] = toScreen(position);
        const isFocus = track.driverNumber === focus;
        const dimmed = focus != null && !isFocus;
        const radius = isFocus ? 12 : 9.5;
        context.globalAlpha = dimmed ? 0.45 : 1;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = hexColor(track.teamColour) ?? '#808080';
        context.fill();
        context.lineWidth = isFocus ? 2.5 : 1.5;
        context.strokeStyle = '#FFFFFF';
        context.stroke();
        context.fillStyle = '#FFFFFF';
        context.font = `700 ${isFocus ? 11 : 9}px Barlow_700Bold, system-ui, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(String(track.driverNumber), x, y + 0.5);
        if (isFocus) {
          context.font = '700 13px Barlow_700Bold, system-ui, sans-serif';
          context.textAlign = 'left';
          const label = track.acronym;
          const w = context.measureText(label).width + 12;
          context.fillStyle = 'rgba(10,10,12,0.85)';
          context.fillRect(x + radius + 4, y - 10, w, 20);
          context.fillStyle = '#FFFFFF';
          context.fillText(label, x + radius + 10, y + 0.5);
        }
        context.globalAlpha = 1;
      }
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [outline, tracks, startFinish, clock, visible, highlighted, viewRef]);

  // Wheel zoom about the pointer, drag to pan, double-click to reset.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const view = viewRef.current;
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left - rect.width / 2;
      const py = event.clientY - rect.top - rect.height / 2;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * Math.exp(-event.deltaY * 0.0015)));
      if (next <= 1.03) {
        viewRef.current = { zoom: 1, panX: 0, panY: 0 };
        return;
      }
      // Keep the point under the pointer where it is.
      const k = next / view.zoom;
      viewRef.current = { zoom: next, panX: px - (px - view.panX) * k, panY: py - (py - view.panY) * k };
    };
    let drag: { x: number; y: number; panX: number; panY: number } | null = null;
    const onDown = (event: PointerEvent) => {
      if (viewRef.current.zoom <= 1) return;
      drag = { x: event.clientX, y: event.clientY, panX: viewRef.current.panX, panY: viewRef.current.panY };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (event: PointerEvent) => {
      if (!drag) return;
      viewRef.current = { ...viewRef.current, panX: drag.panX + event.clientX - drag.x, panY: drag.panY + event.clientY - drag.y };
    };
    const onUp = () => {
      drag = null;
      canvas.style.cursor = '';
    };
    const onDouble = () => {
      viewRef.current = { zoom: 1, panX: 0, panY: 0 };
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('dblclick', onDouble);
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('dblclick', onDouble);
    };
  }, [viewRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Track map with each car's position"
      role="img"
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
    />
  );
}

/** Fits the points into the canvas with padding, preserving proportions. */
function fit(points: NormalizedPoint[], width: number, height: number) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return { x: { minX: 0, minY: 0, maxY: 1, offsetX: 0, offsetY: 0 }, scale: 1 };
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((width - PADDING * 2) / spanX, (height - PADDING * 2) / spanY);
  return {
    x: { minX, minY, maxY, offsetX: (width - spanX * scale) / 2, offsetY: (height - spanY * scale) / 2 },
    scale,
  };
}
