/**
 * The spotlight is a single full-viewport element with a `clip-path` that has
 * a rounded-rectangle hole punched in it.
 *
 * Two properties of `clip-path` make this work with no compositing tricks:
 *
 * 1. Clipping affects hit testing. The clipped-away hole does not receive
 *    pointer events, so clicks land on the real element underneath — which is
 *    what makes an interactive, click-through tour possible without a
 *    four-element "frame" of divs around the target.
 *
 * 2. `clip-path: path()` interpolates when both paths have an identical
 *    sequence of commands. Every path this module emits uses the same command
 *    sequence, so moving the spotlight from one target to the next is a plain
 *    CSS transition — including the degenerate "no target" case, which is a
 *    zero-size hole rather than a different shape.
 *
 * The hole is wound counter-clockwise against a clockwise outer rectangle, so
 * the default nonzero fill rule cuts it out. No `evenodd` needed.
 */

export interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

const n = (v: number) => Math.round(v * 100) / 100;

export function cutoutPath(
  viewportWidth: number,
  viewportHeight: number,
  hole: SpotlightRect | null,
): string {
  const outer = `M0,0 H${n(viewportWidth)} V${n(viewportHeight)} H0 Z`;

  const h: SpotlightRect = hole ?? {
    x: viewportWidth / 2,
    y: viewportHeight / 2,
    width: 0,
    height: 0,
    radius: 0,
  };

  const w = Math.max(0, h.width);
  const ht = Math.max(0, h.height);
  const r = Math.max(0, Math.min(h.radius, w / 2, ht / 2));
  const x = h.x;
  const y = h.y;
  const x2 = x + w;
  const y2 = y + ht;
  const arc = `A${n(r)},${n(r)} 0 0 0`;

  // Counter-clockwise: down the left edge, right along the bottom,
  // up the right edge, left along the top.
  const inner = [
    `M${n(x + r)},${n(y)}`,
    `${arc} ${n(x)},${n(y + r)}`,
    `V${n(y2 - r)}`,
    `${arc} ${n(x + r)},${n(y2)}`,
    `H${n(x2 - r)}`,
    `${arc} ${n(x2)},${n(y2 - r)}`,
    `V${n(y + r)}`,
    `${arc} ${n(x2 - r)},${n(y)}`,
    `H${n(x + r)}`,
    'Z',
  ].join(' ');

  return `path("${outer} ${inner}")`;
}

/** Grow a DOMRect by `padding`, clamped to stay on screen. */
export function padRect(
  rect: DOMRect,
  padding: number,
  radius: number,
  viewportWidth: number,
  viewportHeight: number,
): SpotlightRect {
  const x = Math.max(-padding, rect.left - padding);
  const y = Math.max(-padding, rect.top - padding);
  const right = Math.min(viewportWidth + padding, rect.right + padding);
  const bottom = Math.min(viewportHeight + padding, rect.bottom + padding);
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
    radius: radius + padding * 0.6,
  };
}
