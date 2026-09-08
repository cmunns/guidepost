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
 * 2. `clip-path` shapes interpolate when both values have an identical
 *    sequence of commands. Every shape this module emits uses the same command
 *    sequence, so moving the spotlight from one target to the next is a plain
 *    CSS transition — including the degenerate "no target" case, which is a
 *    zero-size hole rather than a different shape.
 *
 * The hole is wound counter-clockwise against a clockwise outer rectangle, so
 * the default nonzero fill rule cuts it out. No `evenodd` needed.
 *
 * The same geometry is emitted in one of two syntaxes:
 *
 * - `shape()` (CSS Shapes 2) wherever the browser supports it. Beyond being
 *   the modern form, this sidesteps a Chromium bug: Chromium runs `clip-path`
 *   transitions on the compositor through a paint worklet, and that worklet
 *   sizes its mask wrong, so the dim covers only part of the viewport for as
 *   long as the transition runs and then snaps to full. Chromium declines to
 *   composite a `shape()` that contains arc commands, which keeps the
 *   transition on the main thread where it renders correctly. Safari and
 *   Firefox interpolate both syntaxes on the main thread and are unaffected
 *   either way.
 * - `path()` as the fallback for browsers without `shape()`.
 */

export interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

/** Which `clip-path` syntax to emit. See the module comment for why both exist. */
export type CutoutFormat = 'shape' | 'path';

const n = (v: number) => Math.round(v * 100) / 100;

let shapeSupport: boolean | null = null;

/**
 * Whether this browser accepts `clip-path: shape()` with arc commands.
 * Chrome 137+, Safari 18.4+ and Firefox 141+ do.
 */
export function supportsShapeFunction(): boolean {
  if (shapeSupport === null) {
    shapeSupport =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('clip-path', 'shape(from 0px 0px, arc to 1px 1px of 1px, close)');
  }
  return shapeSupport;
}

/** The format the tour uses in this browser. */
export function preferredCutoutFormat(): CutoutFormat {
  return supportsShapeFunction() ? 'shape' : 'path';
}

export function cutoutPath(
  viewportWidth: number,
  viewportHeight: number,
  hole: SpotlightRect | null,
  format: CutoutFormat = 'path',
): string {
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

  // The hole's corner points, counter-clockwise from the top-left corner: down
  // the left edge, along the bottom, up the right edge, back along the top.
  // Odd indices end an arc, even indices end a straight edge, and the straight
  // edges alternate vertical / horizontal.
  const pts: [number, number][] = [
    [x + r, y],
    [x, y + r],
    [x, y2 - r],
    [x + r, y2],
    [x2 - r, y2],
    [x2, y2 - r],
    [x2, y + r],
    [x2 - r, y],
  ];

  const shape = format === 'shape';
  const pt = ([a, b]: [number, number]) => (shape ? `${n(a)}px ${n(b)}px` : `${n(a)},${n(b)}`);
  const inner = pts.map((p, i) => {
    if (i === 0) return shape ? `move to ${pt(p)}` : `M${pt(p)}`;
    // `arc to` sweeps counter-clockwise by default, like sweep-flag 0 in SVG.
    if (i % 2) return shape ? `arc to ${pt(p)} of ${n(r)}px` : `A${n(r)},${n(r)} 0 0 0 ${pt(p)}`;
    const vertical = i % 4 === 2;
    const v = n(vertical ? p[1] : p[0]);
    return shape ? `${vertical ? 'vline' : 'hline'} to ${v}px` : `${vertical ? 'V' : 'H'}${v}`;
  });
  inner.push(shape ? `hline to ${n(x + r)}px` : `H${n(x + r)}`);

  const vw = n(viewportWidth);
  const vh = n(viewportHeight);
  return shape
    ? `shape(from 0px 0px, hline to ${vw}px, vline to ${vh}px, hline to 0px, close, ${inner.join(', ')}, close)`
    : `path("M0,0 H${vw} V${vh} H0 Z ${inner.join(' ')} Z")`;
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
