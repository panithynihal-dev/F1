import type { FlowPalette } from '@/logic/helmets';

import type { FluidName } from './registry';

// Draws every visible helmet-colour name into one offscreen canvas, letter by letter at exactly the
// position the browser laid it out, so the fluid shader knows where the letters are.
//   red   = how much of the pixel is letter (antialiased)
//   green = which name's palette to use (palette id × 20), so each name keeps its own colours.

export interface MaskResult {
  /** Distinct palettes in id order. */
  palettes: FlowPalette[];
  /** Boxes of the visible names in CSS pixels, for the ambient splats. */
  boxes: DOMRect[];
}

const ID_STEP = 20;
export const MAX_PALETTES = 12;

/** A cheap fingerprint of where every name sits, to redraw the mask only when something moved. */
export function layoutSignature(names: Iterable<FluidName>) {
  let sig = '';
  for (const n of names) {
    const r = n.el.getBoundingClientRect();
    sig += `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)},${n.el.textContent?.length ?? 0},${hidden(n.el) ? 1 : 0};`;
  }
  return sig;
}

/** A name inside a carousel slide that isn't showing counts as hidden. */
const hidden = (el: HTMLElement) => !el.isConnected || !!el.closest('[aria-hidden="true"]');

export function drawMask(
  ctx: CanvasRenderingContext2D,
  names: Iterable<FluidName>,
  clip: { top: number; bottom: number },
): MaskResult {
  const { width, height } = ctx.canvas;
  const scale = width / window.innerWidth;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(scale, scale);
  // Never paint under the top nav or the phone tab bar.
  ctx.beginPath();
  ctx.rect(0, clip.top, window.innerWidth, clip.bottom - clip.top);
  ctx.clip();

  const palettes: FlowPalette[] = [];
  const boxes: DOMRect[] = [];
  const range = document.createRange();

  for (const n of names) {
    if (hidden(n.el)) continue;
    const box = n.el.getBoundingClientRect();
    if (box.bottom < clip.top || box.top > clip.bottom || box.width === 0) continue;
    const textNode = n.el.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) continue;

    let id = palettes.indexOf(n.palette);
    if (id < 0) {
      if (palettes.length >= MAX_PALETTES) continue;
      id = palettes.push(n.palette) - 1;
    }
    boxes.push(box);

    const style = getComputedStyle(n.el);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const ascent = ctx.measureText('H').fontBoundingBoxAscent;
    ctx.fillStyle = `rgb(255, ${id * ID_STEP}, 0)`;

    const text = (textNode as Text).data;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n' || text[i] === ' ') continue;
      range.setStart(textNode, i);
      range.setEnd(textNode, i + 1);
      const r = range.getBoundingClientRect();
      if (r.width === 0) continue;
      ctx.fillText(text[i].toUpperCase(), r.left, r.top + ascent);
    }
  }
  ctx.restore();
  return { palettes, boxes };
}
