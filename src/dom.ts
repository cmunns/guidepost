import type { StepTarget } from './types.js';

export const isBrowser = typeof document !== 'undefined';

export function resolveTarget(target: StepTarget | undefined): Element | null {
  if (!target) return null;
  if (typeof target === 'string') return document.querySelector(target);
  if (typeof target === 'function') return target() ?? null;
  return target;
}

/** An element is "usable" if it is connected and actually renders a box. */
export function isVisible(el: Element | null): el is Element {
  if (!el || !el.isConnected) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
}

/**
 * Resolve a target that may not exist yet — a lazily rendered panel, a route
 * that is still loading, a menu the previous step just opened.
 */
export function waitForTarget(
  target: StepTarget | undefined,
  timeout: number,
  signal?: AbortSignal,
): Promise<Element | null> {
  const immediate = resolveTarget(target);
  if (isVisible(immediate) || timeout <= 0) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: Element | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(value);
    };
    const onAbort = () => finish(null);
    const check = () => {
      const found = resolveTarget(target);
      if (isVisible(found)) finish(found);
    };
    const observer = new MutationObserver(check);
    const timer = setTimeout(() => finish(resolveTarget(target)), timeout);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
    });
    signal?.addEventListener('abort', onAbort, { once: true });
    check();
  });
}

/**
 * Is the element far enough out of view to be worth scrolling to? Re-centring
 * something the user can already see makes the page lurch for no reason.
 */
export function needsScroll(el: Element, margin = 24): boolean {
  const r = el.getBoundingClientRect();
  const vw = Math.min(document.documentElement.clientWidth, window.innerWidth);
  const vh = Math.min(document.documentElement.clientHeight, window.innerHeight);

  // How much of the element the viewport is actually showing.
  const shownY = Math.min(r.bottom, vh) - Math.max(r.top, 0);
  const shownX = Math.min(r.right, vw) - Math.max(r.left, 0);

  // The most that *could* be shown — an element taller than the viewport can
  // never be fully visible, and asking for that would scroll on every step.
  const wantY = Math.min(r.height, vh - margin * 2);
  const wantX = Math.min(r.width, vw - margin * 2);

  return shownY < wantY - 1 || shownX < wantX - 1;
}

export function prefersReducedMotion(): boolean {
  return isBrowser && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Scroll an element into view and resolve once scrolling has actually settled. */
export function scrollIntoViewAndSettle(
  el: Element,
  behavior: ScrollBehavior,
  timeout = 700,
): Promise<void> {
  el.scrollIntoView({ block: 'center', inline: 'nearest', behavior });
  if (behavior !== 'smooth') return Promise.resolve();

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('scrollend', finish, true);
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      resolve();
    };
    const timer = setTimeout(finish, timeout);

    if ('onscrollend' in window) {
      window.addEventListener('scrollend', finish, { capture: true, once: true });
    }

    // Fallback (and safety net): resolve once the rect stops moving.
    let last = el.getBoundingClientRect().top;
    let stable = 0;
    const tick = () => {
      const now = el.getBoundingClientRect().top;
      stable = Math.abs(now - last) < 0.5 ? stable + 1 : 0;
      last = now;
      if (stable > 3) return finish();
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);
  });
}

/** Largest corner radius on the element, used to shape the spotlight. */
export function inferRadius(el: Element): number {
  const cs = getComputedStyle(el);
  const radii = [
    cs.borderTopLeftRadius,
    cs.borderTopRightRadius,
    cs.borderBottomRightRadius,
    cs.borderBottomLeftRadius,
  ].map((v) => parseFloat(v) || 0);
  return Math.max(0, ...radii);
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** rAF-coalesced callback. Repeated calls within a frame collapse into one. */
export function throttleFrame(fn: () => void): { run: () => void; cancel: () => void } {
  let raf = 0;
  return {
    run() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        fn();
      });
    },
    cancel() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
