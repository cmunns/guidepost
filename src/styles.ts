export const STYLE_ID = 'guidepost-styles';

/**
 * Everything here is designed so the browser owns the animation:
 *
 * - `@starting-style` + `transition-behavior: allow-discrete` on `display` and
 *   `overlay` gives us enter *and* exit transitions on a top-layer element
 *   without a single JS timer, and without the classic "element disappears
 *   before the fade finishes" bug.
 * - The spotlight moves by transitioning `clip-path` between two paths that
 *   share a command sequence.
 * - All durations flow through `--gp-duration`, which drops to 1ms under
 *   `prefers-reduced-motion`.
 */
export const CSS = /* css */ `
.gp-root {
  display: contents;
}

.gp-scrim,
.gp-ring,
.gp-blocker,
.gp-card {
  --gp-duration: 260ms;
  --gp-move-duration: 380ms;
  --gp-ease: cubic-bezier(0.32, 0.72, 0, 1);
}

.gp-root[data-animate="false"] .gp-scrim,
.gp-root[data-animate="false"] .gp-ring,
.gp-root[data-animate="false"] .gp-card {
  --gp-duration: 1ms;
  --gp-move-duration: 1ms;
}

/* ---------- shared popover resets ---------- */

.gp-scrim,
.gp-blocker,
.gp-ring,
.gp-card {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  max-width: none;
  max-height: none;
  width: auto;
  height: auto;
  overflow: visible;
}

.gp-scrim::backdrop,
.gp-blocker::backdrop,
.gp-ring::backdrop,
.gp-card::backdrop {
  background: transparent;
}

/* ---------- scrim: the dim, with a hole punched in it ---------- */

.gp-scrim {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  background: var(--gp-overlay, rgb(9 11 16 / 0.62));
  opacity: 0;
  transition:
    clip-path var(--gp-move-duration) var(--gp-ease),
    opacity var(--gp-duration) var(--gp-ease),
    display var(--gp-duration) allow-discrete,
    overlay var(--gp-duration) allow-discrete;
}

.gp-scrim:popover-open {
  opacity: 1;
}

@starting-style {
  .gp-scrim:popover-open {
    opacity: 0;
  }
}

/* A transparent sheet that swallows pointer events when the tour is
   fully blocking. Separate from the scrim so the scrim's cutout can stay
   click-through in interactive mode. */
.gp-blocker {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  pointer-events: none;
}

.gp-root[data-interactive="false"] .gp-blocker:popover-open {
  pointer-events: auto;
}

/* ---------- ring: the glow around the spotlighted element ---------- */

.gp-ring {
  position: fixed;
  pointer-events: none;
  opacity: 0;
  box-shadow:
    0 0 0 1px var(--gp-ring-color, rgb(255 255 255 / 0.85)),
    0 0 0 6px var(--gp-ring-halo, rgb(99 102 241 / 0.28));
  transition:
    left var(--gp-move-duration) var(--gp-ease),
    top var(--gp-move-duration) var(--gp-ease),
    width var(--gp-move-duration) var(--gp-ease),
    height var(--gp-move-duration) var(--gp-ease),
    border-radius var(--gp-move-duration) var(--gp-ease),
    opacity var(--gp-duration) var(--gp-ease),
    display var(--gp-duration) allow-discrete,
    overlay var(--gp-duration) allow-discrete;
}

.gp-ring:popover-open {
  opacity: 1;
}

.gp-ring[data-empty="true"] {
  opacity: 0;
}

@starting-style {
  .gp-ring:popover-open {
    opacity: 0;
  }
}

/* ---------- card ---------- */

.gp-card {
  position: fixed;
  inset: auto;
  box-sizing: border-box;
  width: max-content;
  max-width: min(var(--gp-card-width, 22rem), calc(100vw - 2rem));
  padding: var(--gp-card-padding, 1.125rem 1.25rem 1rem);
  background: var(--gp-surface, #ffffff);
  color: var(--gp-text, #14161c);
  border-radius: var(--gp-radius, 0.875rem);
  box-shadow: var(--gp-shadow,
    0 1px 1px rgb(9 11 16 / 0.04),
    0 8px 24px -6px rgb(9 11 16 / 0.18),
    0 24px 56px -12px rgb(9 11 16 / 0.26));
  font: var(--gp-font, 400 0.9375rem/1.55 system-ui, -apple-system, "Segoe UI", sans-serif);
  opacity: 0;
  scale: 0.97;
  /* translate is deliberately NOT transitioned. It carries the card's
     position, and a CSS transition on it would race the FLIP animation --
     which animates transform, a separate property that composes with
     translate instead of fighting it. */
  transition:
    opacity var(--gp-duration) var(--gp-ease),
    scale var(--gp-duration) var(--gp-ease),
    display var(--gp-duration) allow-discrete,
    overlay var(--gp-duration) allow-discrete;
}

.gp-card:popover-open {
  opacity: 1;
  scale: 1;
}

/* The shell glides and resizes (FLIP, via the Web Animations API) while the
   content cross-fades, so a step change reads as one object moving rather than
   two cards swapping. */
.gp-content {
  transition: opacity 130ms var(--gp-ease);
}

.gp-card[data-swapping="true"] .gp-content,
.gp-card[data-swapping="true"] .gp-arrow {
  opacity: 0;
}

/* Full cover. Used whenever the step change involves work that outlasts a
   frame — a scroll, a waitFor, an async beforeShow — so the card is never
   left hovering over a page that is moving underneath it. */
.gp-card[data-cover="true"] {
  opacity: 0;
  pointer-events: none;
}

/* Clip while the shell is mid-resize so reflowing text can't spill out. */
.gp-card[data-animating="true"] {
  overflow: clip;
}

.gp-card[data-animating="true"] .gp-arrow {
  opacity: 0;
}

@starting-style {
  .gp-card:popover-open {
    opacity: 0;
    scale: 0.97;
  }
}

.gp-card:focus-visible {
  outline: 2px solid var(--gp-accent, #4f46e5);
  outline-offset: 3px;
}

.gp-card[data-placement="center"] .gp-arrow {
  display: none;
}

/* ---------- arrow ---------- */

.gp-arrow {
  position: absolute;
  width: var(--gp-arrow-size, 12px);
  height: var(--gp-arrow-size, 12px);
  background: var(--gp-surface, #ffffff);
  rotate: 45deg;
  border-radius: 2px;
  pointer-events: none;
  transition: opacity 130ms var(--gp-ease);
}

.gp-card[data-side="bottom"] .gp-arrow { top: calc(var(--gp-arrow-size, 12px) / -2); }
.gp-card[data-side="top"] .gp-arrow    { bottom: calc(var(--gp-arrow-size, 12px) / -2); }
.gp-card[data-side="right"] .gp-arrow  { left: calc(var(--gp-arrow-size, 12px) / -2); }
.gp-card[data-side="left"] .gp-arrow   { right: calc(var(--gp-arrow-size, 12px) / -2); }

/* ---------- card contents ---------- */

.gp-counter {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--gp-muted, #6b7180);
}

.gp-title {
  margin: 0 0 0.375rem;
  font-size: 1rem;
  font-weight: 650;
  line-height: 1.35;
  color: inherit;
}

.gp-body {
  margin: 0;
  color: var(--gp-body-text, #454a58);
}

.gp-body > :first-child { margin-block-start: 0; }
.gp-body > :last-child { margin-block-end: 0; }

.gp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
}

.gp-progress {
  display: flex;
  align-items: center;
  gap: 0.3125rem;
}

.gp-dot {
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: 50%;
  background: var(--gp-dot, #d3d6de);
  transition:
    background-color var(--gp-duration) var(--gp-ease),
    width var(--gp-duration) var(--gp-ease);
}

.gp-dot[data-state="current"] {
  width: 1.125rem;
  border-radius: 999px;
  background: var(--gp-accent, #4f46e5);
}

.gp-dot[data-state="done"] {
  background: var(--gp-accent-soft, #a5a8f0);
}

.gp-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-inline-start: auto;
}

.gp-btn {
  appearance: none;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  padding: 0.4375rem 0.8125rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 550;
  line-height: 1.2;
  cursor: pointer;
  transition:
    background-color 140ms var(--gp-ease),
    border-color 140ms var(--gp-ease),
    color 140ms var(--gp-ease);
}

.gp-btn:focus-visible {
  outline: 2px solid var(--gp-accent, #4f46e5);
  outline-offset: 2px;
}

.gp-btn[data-variant="primary"] {
  background: var(--gp-accent, #4f46e5);
  color: var(--gp-accent-text, #ffffff);
}

.gp-btn[data-variant="primary"]:hover {
  background: var(--gp-accent-hover, #4338ca);
}

.gp-btn[data-variant="secondary"] {
  background: var(--gp-surface-2, #f2f3f6);
  border-color: var(--gp-border, #e2e4ea);
  color: inherit;
}

.gp-btn[data-variant="secondary"]:hover {
  background: var(--gp-surface-3, #e8eaf0);
}

.gp-btn[data-variant="ghost"] {
  background: transparent;
  color: var(--gp-muted, #6b7180);
}

.gp-btn[data-variant="ghost"]:hover {
  color: inherit;
}

.gp-btn[aria-disabled="true"] {
  opacity: 0.45;
  cursor: default;
}

.gp-close {
  position: absolute;
  inset-block-start: 0.5rem;
  inset-inline-end: 0.5rem;
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 0.4375rem;
  background: transparent;
  color: var(--gp-muted, #6b7180);
  font: inherit;
  font-size: 1.125rem;
  line-height: 1;
  cursor: pointer;
  transition: background-color 140ms var(--gp-ease), color 140ms var(--gp-ease);
}

.gp-close:hover {
  background: var(--gp-surface-2, #f2f3f6);
  color: inherit;
}

.gp-close:focus-visible {
  outline: 2px solid var(--gp-accent, #4f46e5);
  outline-offset: 2px;
}

.gp-card[data-has-close="true"] .gp-head {
  padding-inline-end: 1.5rem;
}

.gp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* ---------- dark mode ---------- */

@media (prefers-color-scheme: dark) {
  .gp-card {
    --gp-surface: #191b22;
    --gp-surface-2: #23262f;
    --gp-surface-3: #2c3039;
    --gp-border: #333743;
    --gp-text: #eceef4;
    --gp-body-text: #b9becb;
    --gp-muted: #8d93a3;
    --gp-dot: #3a3e4a;
    --gp-shadow:
      0 1px 1px rgb(0 0 0 / 0.3),
      0 10px 30px -8px rgb(0 0 0 / 0.55),
      0 28px 64px -16px rgb(0 0 0 / 0.6);
  }
  .gp-arrow { background: var(--gp-surface, #191b22); }
  .gp-scrim { --gp-overlay: rgb(3 4 8 / 0.72); }
}

/* ---------- reduced motion ---------- */

@media (prefers-reduced-motion: reduce) {
  .gp-scrim,
  .gp-ring,
  .gp-card,
  .gp-dot {
    --gp-duration: 1ms;
    --gp-move-duration: 1ms;
    transition-duration: 1ms !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gp-content,
  .gp-arrow {
    transition-duration: 1ms !important;
  }
}
`;

let injected = false;

export function injectStyles(): void {
  if (injected || typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) {
    injected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
  injected = true;
}
