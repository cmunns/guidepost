import type { Align, Placement, Side } from './types.js';

export const ANCHOR_NAME = '--guidepost-anchor';

let anchorSupport: boolean | null = null;

/** Does the browser implement CSS anchor positioning? */
export function supportsAnchorPositioning(): boolean {
  if (anchorSupport !== null) return anchorSupport;
  anchorSupport =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('anchor-name', '--x') &&
    CSS.supports('position-area', 'top');
  return anchorSupport;
}

/**
 * An element can only be anchored to something that precedes it in DOM order
 * (or is an ancestor). The tour card is appended last, so this is almost
 * always true — but "almost" is why we check instead of assuming.
 */
export function canAnchorTo(target: Element, card: Element): boolean {
  if (target.contains(card)) return true;
  const pos = target.compareDocumentPosition(card);
  return Boolean(pos & Node.DOCUMENT_POSITION_FOLLOWING);
}

export function splitPlacement(placement: Placement): { side: Side; align: Align } {
  if (placement === 'center') return { side: 'bottom', align: 'center' };
  const [side, align] = placement.split('-') as [Side, Align | undefined];
  return { side, align: align ?? 'center' };
}

/**
 * Map a placement to a `position-area` value.
 *
 * `top span-right` means "the row above the anchor, spanning the anchor's own
 * column plus the one to its right" — which lines the card's left edge up with
 * the anchor's left edge. That is what everyone else calls `top-start`.
 */
const POSITION_AREA: Record<string, string> = {
  top: 'top',
  'top-start': 'top span-right',
  'top-center': 'top',
  'top-end': 'top span-left',
  bottom: 'bottom',
  'bottom-start': 'bottom span-right',
  'bottom-center': 'bottom',
  'bottom-end': 'bottom span-left',
  left: 'left',
  'left-start': 'left span-bottom',
  'left-center': 'left',
  'left-end': 'left span-top',
  right: 'right',
  'right-start': 'right span-bottom',
  'right-center': 'right',
  'right-end': 'right span-top',
};

export function positionArea(placement: Placement): string {
  return POSITION_AREA[placement] ?? 'bottom';
}

export function flipSide(side: Side): Side {
  return { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side] as Side;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComputedPosition {
  x: number;
  y: number;
  side: Side;
  align: Align;
}

/**
 * Measured fallback for browsers without anchor positioning: try the preferred
 * placement, then the caller's fallbacks, then the opposite side, and pick the
 * first that fits. If nothing fits, keep the best-fitting one and clamp it into
 * the viewport.
 */
export function computePosition(
  anchor: Rect,
  card: Rect,
  placement: Placement,
  offset: number,
  margin = 8,
  fallbacks: Placement[] = [],
): ComputedPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const { side: preferredSide } = splitPlacement(placement);
  const candidates: Placement[] = [
    placement,
    ...fallbacks,
    ...(placement === 'center'
      ? []
      : [`${flipSide(preferredSide)}${placement.includes('-') ? placement.slice(placement.indexOf('-')) : ''}` as Placement]),
  ];

  let best: ComputedPosition | null = null;
  let bestOverflow = Infinity;

  for (const candidate of candidates) {
    const { side, align } = splitPlacement(candidate);
    const placed = place(anchor, card, side, align, offset);
    const overflow = overflowAmount(placed, card, vw, vh, margin);
    if (overflow === 0) return clampPosition(placed, card, vw, vh, margin);
    if (overflow < bestOverflow) {
      bestOverflow = overflow;
      best = placed;
    }
  }

  const fallback = best ?? place(anchor, card, preferredSide, 'center', offset);
  return clampPosition(fallback, card, vw, vh, margin);
}

function place(
  anchor: Rect,
  card: Rect,
  side: Side,
  align: Align,
  offset: number,
): ComputedPosition {
  let x = 0;
  let y = 0;

  if (side === 'top' || side === 'bottom') {
    y = side === 'top' ? anchor.y - card.height - offset : anchor.y + anchor.height + offset;
    x =
      align === 'start'
        ? anchor.x
        : align === 'end'
          ? anchor.x + anchor.width - card.width
          : anchor.x + anchor.width / 2 - card.width / 2;
  } else {
    x = side === 'left' ? anchor.x - card.width - offset : anchor.x + anchor.width + offset;
    y =
      align === 'start'
        ? anchor.y
        : align === 'end'
          ? anchor.y + anchor.height - card.height
          : anchor.y + anchor.height / 2 - card.height / 2;
  }

  return { x, y, side, align };
}

function overflowAmount(pos: ComputedPosition, card: Rect, vw: number, vh: number, margin: number) {
  const left = Math.max(0, margin - pos.x);
  const top = Math.max(0, margin - pos.y);
  const right = Math.max(0, pos.x + card.width - (vw - margin));
  const bottom = Math.max(0, pos.y + card.height - (vh - margin));
  return left + top + right + bottom;
}

function clampPosition(
  pos: ComputedPosition,
  card: Rect,
  vw: number,
  vh: number,
  margin: number,
): ComputedPosition {
  return {
    ...pos,
    x: Math.min(Math.max(margin, pos.x), Math.max(margin, vw - card.width - margin)),
    y: Math.min(Math.max(margin, pos.y), Math.max(margin, vh - card.height - margin)),
  };
}

/**
 * Work out which side the card actually ended up on by comparing the two
 * rects. Necessary because `position-try-fallbacks` can flip the card without
 * telling us, and the arrow has to agree with reality.
 */
export function resolveSide(cardRect: DOMRect, anchorRect: DOMRect): Side {
  const gaps: Array<[Side, number]> = [
    ['top', anchorRect.top - cardRect.bottom],
    ['bottom', cardRect.top - anchorRect.bottom],
    ['left', anchorRect.left - cardRect.right],
    ['right', cardRect.left - anchorRect.right],
  ];
  let bestSide: Side = 'bottom';
  let bestGap = -Infinity;
  for (const [side, gap] of gaps) {
    if (gap >= 0 && gap > bestGap) {
      bestGap = gap;
      bestSide = side;
    }
  }
  if (bestGap === -Infinity) {
    // Overlapping — pick the side with the most clearance.
    const vertical = anchorRect.top + anchorRect.height / 2 - (cardRect.top + cardRect.height / 2);
    return vertical > 0 ? 'top' : 'bottom';
  }
  return bestSide;
}

/** Offset of the arrow along the card's edge, clamped so it never hangs off. */
export function arrowOffset(
  cardRect: DOMRect,
  anchorRect: DOMRect,
  side: Side,
  arrowSize: number,
  cornerInset: number,
): number {
  const horizontal = side === 'top' || side === 'bottom';
  const anchorCenter = horizontal
    ? anchorRect.left + anchorRect.width / 2
    : anchorRect.top + anchorRect.height / 2;
  const cardStart = horizontal ? cardRect.left : cardRect.top;
  const cardLength = horizontal ? cardRect.width : cardRect.height;
  const raw = anchorCenter - cardStart - arrowSize / 2;
  const min = cornerInset;
  const max = Math.max(min, cardLength - arrowSize - cornerInset);
  return Math.min(Math.max(raw, min), max);
}
