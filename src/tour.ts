import {
  inferRadius,
  isVisible,
  needsScroll,
  nextFrame,
  prefersReducedMotion,
  scrollIntoViewAndSettle,
  throttleFrame,
  waitForTarget,
} from './dom.js';
import { InertManager } from './inert.js';
import {
  ANCHOR_NAME,
  arrowOffset,
  canAnchorTo,
  computePosition,
  positionArea,
  resolveSide,
  supportsAnchorPositioning,
} from './position.js';
import {
  cutoutPath,
  padRect,
  preferredCutoutFormat,
  type CutoutFormat,
  type SpotlightRect,
} from './spotlight.js';
import { injectStyles } from './styles.js';
import type {
  Placement,
  Side,
  StepButton,
  TourController,
  TourLabels,
  TourOptions,
  TourStep,
} from './types.js';

const DEFAULT_LABELS: TourLabels = {
  next: 'Next',
  back: 'Back',
  done: 'Done',
  close: 'Close tour',
  counter: (index, total) => `Step ${index + 1} of ${total}`,
  progress: 'Tour progress',
};

const ARROW_SIZE = 12;
const ARROW_INSET = 14;
const SWAP_MS = 130;

let uid = 0;

export class Tour implements TourController {
  readonly steps: TourStep[];

  #opts: TourOptions;
  #labels: TourLabels;
  #uid = `gp-${++uid}`;

  #index = -1;
  #active = false;
  #destroyed = false;
  #showToken = 0;

  #root: HTMLElement | null = null;
  #scrim!: HTMLElement;
  #blocker!: HTMLElement;
  #ring!: HTMLElement;
  #card!: HTMLElement;
  #content!: HTMLElement;
  #arrow!: HTMLElement;
  #counter!: HTMLElement;
  #title!: HTMLElement;
  #body!: HTMLElement;
  #progress!: HTMLElement;
  #actions!: HTMLElement;
  #closeBtn!: HTMLButtonElement;
  #live!: HTMLElement;

  #target: Element | null = null;
  #inert = new InertManager();
  #previousFocus: HTMLElement | null = null;
  #savedAnchorName: string | null = null;
  #anchoredEl: HTMLElement | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #advanceCleanup: (() => void) | null = null;
  #abort: AbortController | null = null;
  #updater = throttleFrame(() => this.#update());
  #useAnchor = false;
  #cutoutFormat: CutoutFormat = 'path';

  constructor(options: TourOptions) {
    this.#opts = options;
    this.steps = options.steps;
    this.#labels = { ...DEFAULT_LABELS, ...(options.labels ?? {}) };
  }

  // ---------------------------------------------------------------- getters

  get index(): number {
    return this.#index;
  }

  get current(): TourStep | null {
    return this.steps[this.#index] ?? null;
  }

  get isActive(): boolean {
    return this.#active;
  }

  /** Has this tour id been completed before? Requires `id` + `remember`. */
  static hasCompleted(id: string): boolean {
    try {
      return localStorage.getItem(`guidepost:${id}`) === 'done';
    } catch {
      return false;
    }
  }

  static clearCompleted(id: string): void {
    try {
      localStorage.removeItem(`guidepost:${id}`);
    } catch {
      /* storage unavailable — nothing to clear */
    }
  }

  // ---------------------------------------------------------------- control

  async start(at: number | string = 0): Promise<void> {
    if (this.#destroyed || this.#active) return;
    const enabled = this.#enabled();
    if (enabled.length === 0) return;

    if (this.#opts.injectStyles !== false) injectStyles();
    this.#mount();
    this.#cutoutFormat = preferredCutoutFormat();

    this.#active = true;
    this.#previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    this.#scrim.showPopover();
    this.#blocker.showPopover();
    this.#ring.showPopover();
    this.#card.showPopover();

    this.#bindGlobal();
    this.#opts.onStart?.(this);

    const start = this.#resolveIndex(at);
    await this.#show(start >= 0 ? start : (enabled[0] as number));
  }

  async next(): Promise<void> {
    const target = this.#step(1);
    if (target === -1) return this.complete();
    return this.#show(target);
  }

  async back(): Promise<void> {
    const target = this.#step(-1);
    if (target === -1) return;
    return this.#show(target);
  }

  async goTo(indexOrId: number | string): Promise<void> {
    const target = this.#resolveIndex(indexOrId);
    if (target === -1) return;
    return this.#show(target);
  }

  async complete(): Promise<void> {
    if (!this.#active) return;
    if (this.#opts.remember && this.#opts.id) {
      try {
        localStorage.setItem(`guidepost:${this.#opts.id}`, 'done');
      } catch {
        /* storage unavailable — completion just isn't remembered */
      }
    }
    await this.#end();
    this.#opts.onComplete?.(this);
  }

  async cancel(): Promise<void> {
    if (!this.#active) return;
    await this.#end();
    this.#opts.onCancel?.(this);
  }

  refresh(): void {
    if (this.#active) this.#update();
  }

  destroy(): void {
    if (this.#destroyed) return;
    void this.#end();
    this.#root?.remove();
    this.#root = null;
    this.#destroyed = true;
    this.#opts.onDestroy?.(this);
  }

  // ---------------------------------------------------------------- stepping

  #enabled(): number[] {
    const out: number[] = [];
    this.steps.forEach((step, i) => {
      if (step.when?.() === false) return;
      out.push(i);
    });
    return out;
  }

  #resolveIndex(value: number | string): number {
    if (typeof value === 'number') {
      return this.steps[value] ? value : -1;
    }
    return this.steps.findIndex((s) => s.id === value);
  }

  #step(direction: 1 | -1): number {
    const enabled = this.#enabled();
    const position = enabled.indexOf(this.#index);
    const nextPosition = position === -1 ? 0 : position + direction;
    return enabled[nextPosition] ?? -1;
  }

  // ---------------------------------------------------------------- lifecycle

  #mount(): void {
    if (this.#root) return;
    const container = this.#opts.container ?? document.body;

    const root = document.createElement('div');
    root.className = 'gp-root';
    root.dataset.guidepost = this.#opts.id ?? this.#uid;
    root.dataset.interactive = String(this.#interactive());
    root.dataset.animate = String(this.#animates());

    root.innerHTML = `
      <div class="gp-scrim" popover="manual" part="scrim"></div>
      <div class="gp-blocker" popover="manual"></div>
      <div class="gp-ring" popover="manual" part="ring" data-empty="true"></div>
      <div class="gp-card" popover="manual" part="card" role="dialog" tabindex="-1">
        <span class="gp-arrow" part="arrow" aria-hidden="true"></span>
        <div class="gp-content">
          <div class="gp-head">
            <p class="gp-counter" id="${this.#uid}-counter" part="counter"></p>
            <h2 class="gp-title" id="${this.#uid}-title" part="title"></h2>
          </div>
          <div class="gp-body" id="${this.#uid}-body" part="body"></div>
          <div class="gp-foot">
            <div class="gp-progress" part="progress" aria-hidden="true"></div>
            <div class="gp-actions" part="actions"></div>
          </div>
        </div>
        <button class="gp-close" type="button" part="close"></button>
      </div>
      <div class="gp-sr" aria-live="polite" aria-atomic="true"></div>
    `;

    container.appendChild(root);

    this.#root = root;
    this.#scrim = root.querySelector('.gp-scrim')!;
    this.#blocker = root.querySelector('.gp-blocker')!;
    this.#ring = root.querySelector('.gp-ring')!;
    this.#card = root.querySelector('.gp-card')!;
    this.#content = root.querySelector('.gp-content')!;
    this.#arrow = root.querySelector('.gp-arrow')!;
    this.#counter = root.querySelector('.gp-counter')!;
    this.#title = root.querySelector('.gp-title')!;
    this.#body = root.querySelector('.gp-body')!;
    this.#progress = root.querySelector('.gp-progress')!;
    this.#actions = root.querySelector('.gp-actions')!;
    this.#closeBtn = root.querySelector('.gp-close')!;
    this.#live = root.querySelector('.gp-sr')!;

    this.#closeBtn.textContent = '×';
    this.#closeBtn.setAttribute('aria-label', this.#labels.close);
    this.#closeBtn.hidden = this.#opts.showClose === false;
    this.#card.dataset.hasClose = String(this.#opts.showClose !== false);
    this.#card.setAttribute('aria-describedby', `${this.#uid}-body`);
    if (this.#opts.blocking !== false && !this.#interactive()) {
      this.#card.setAttribute('aria-modal', 'true');
    }

    this.#closeBtn.addEventListener('click', () => void this.cancel());
    this.#scrim.addEventListener('click', () => {
      if (this.#opts.exitOnOverlayClick) void this.cancel();
    });

    this.#resizeObserver = new ResizeObserver(() => this.#updater.run());
    this.#resizeObserver.observe(this.#card);
  }

  async #show(index: number): Promise<void> {
    if (!this.#active || this.#destroyed) return;
    const step = this.steps[index];
    if (!step) return;

    const token = ++this.#showToken;
    this.#abort?.abort();
    this.#abort = new AbortController();
    const { signal } = this.#abort;

    const wasOpen = this.#index !== -1 && this.#card.matches(':popover-open');
    const animate = this.#animates();

    // Fade the content out *before* any async work. Everything between here
    // and the reposition below happens behind that fade, so no intermediate
    // state is ever on screen.
    if (wasOpen && animate) {
      this.#card.dataset.swapping = 'true';
      await wait(SWAP_MS);
      if (token !== this.#showToken) return;
    }

    await this.#teardownStep();
    if (token !== this.#showToken) return;

    // Anything that can take more than a frame — a beforeShow promise, waiting
    // for a lazily rendered target, a smooth scroll — hides the card shell too,
    // rather than leaving it hanging over a page that is moving underneath it.
    const slow = Boolean(step.beforeShow || step.waitFor);
    if (wasOpen && animate && slow) this.#card.dataset.cover = 'true';

    await step.beforeShow?.(this);
    if (token !== this.#showToken || !this.#active) return;

    // Resolve the target, waiting for it if the step says to.
    let target: Element | null = null;
    if (step.target) {
      const wait = typeof step.waitFor === 'number' ? step.waitFor : 0;
      if (typeof step.waitFor === 'function') {
        await this.#waitForCondition(step.waitFor, signal);
        if (token !== this.#showToken) return;
      }
      target = await waitForTarget(step.target, wait, signal);
      if (token !== this.#showToken) return;

      if (!isVisible(target)) {
        const policy = this.#opts.onMissingTarget ?? 'skip';
        if (policy === 'error') {
          throw new Error(
            `[guidepost] Target for step ${step.id ?? index} was not found: ${String(step.target)}`,
          );
        }
        if (policy === 'skip') {
          this.#index = index;
          const forward = this.#step(1);
          if (forward === -1) return this.complete();
          return this.#show(forward);
        }
        target = null;
      }
    }

    // Only scroll when the target is genuinely out of view. Re-centring an
    // element the user can already see reads as the page lurching for no reason.
    if (target && step.scrollTo !== false && needsScroll(target)) {
      if (wasOpen && animate) this.#card.dataset.cover = 'true';
      await scrollIntoViewAndSettle(target, animate ? 'smooth' : 'auto');
      if (token !== this.#showToken) return;
    }

    // FLIP: where the card is right now. Still tethered to the previous step's
    // target, because the anchor is not released until the new one is applied.
    const first = wasOpen ? this.#card.getBoundingClientRect() : null;

    this.#index = index;
    this.#target = target;
    this.#renderStep(step, index);
    this.#applyAnchor(target);
    this.#update();

    // Glide only when the card was visible throughout. If it was covered, it
    // fades back in at its new home instead of flying across the viewport.
    if (first && animate && this.#card.dataset.cover !== 'true') {
      this.#flip(first);
    }
    // One deferred re-measure: fonts, images and `position-try` can settle a
    // frame after the fact, and the arrow has to agree with where the card
    // actually ended up.
    requestAnimationFrame(() => {
      if (token === this.#showToken) this.#update();
    });

    this.#card.dataset.cover = 'false';
    this.#card.dataset.swapping = 'false';

    this.#applyInert();
    this.#bindAdvance(step, target);
    this.#focusStep(step);

    this.#opts.onShow?.(this, step, index);
  }

  async #teardownStep(): Promise<void> {
    this.#advanceCleanup?.();
    this.#advanceCleanup = null;
    // The anchor is deliberately *not* released here. Dropping `anchor-name`
    // from the outgoing target leaves the card with a `position-anchor` that
    // resolves to nothing, and an unanchored fixed element with `inset: auto`
    // parks in the viewport corner — visible for every frame of the async work
    // that follows. `#applyAnchor` releases the old target instead, in the same
    // task that attaches the new one.
    const step = this.current;
    if (step) await step.afterHide?.(this);
  }

  async #end(): Promise<void> {
    if (!this.#active) return;
    this.#showToken++;
    this.#abort?.abort();
    this.#abort = null;
    this.#active = false;

    await this.#teardownStep();
    // Pin the card where it is before the anchor goes away. `hidePopover()`
    // starts an exit transition, so the card stays on screen for a few hundred
    // more milliseconds — long enough to visibly jump to the viewport corner if
    // its `position-anchor` stopped resolving in the meantime.
    this.#freezeCard();
    this.#releaseAnchor();

    this.#inert.release();
    this.#unbindGlobal();
    this.#updater.cancel();

    for (const el of [this.#card, this.#ring, this.#blocker, this.#scrim]) {
      if (el?.matches(':popover-open')) el.hidePopover();
    }

    this.#index = -1;
    this.#target = null;

    // Give focus back to whatever the user was on before the tour opened.
    const previous = this.#previousFocus;
    this.#previousFocus = null;
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- rendering

  #renderStep(step: TourStep, index: number): void {
    const enabled = this.#enabled();
    const position = Math.max(0, enabled.indexOf(index));
    const total = enabled.length;

    // Counter
    const showCounter = this.#opts.showCounter !== false && total > 1;
    this.#counter.textContent = showCounter ? this.#labels.counter(position, total) : '';
    this.#counter.hidden = !showCounter;

    // Title
    this.#title.textContent = step.title ?? '';
    this.#title.hidden = !step.title;

    // Accessible name: counter first so "Step 2 of 5, Invite your team" reads
    // as one label instead of arriving as a separate live announcement.
    const labelledBy = [
      showCounter ? `${this.#uid}-counter` : '',
      step.title ? `${this.#uid}-title` : '',
    ]
      .filter(Boolean)
      .join(' ');
    if (labelledBy) this.#card.setAttribute('aria-labelledby', labelledBy);
    else this.#card.removeAttribute('aria-labelledby');

    // Body
    this.#body.replaceChildren();
    if (step.html instanceof HTMLElement) {
      this.#body.appendChild(step.html);
    } else if (typeof step.html === 'string') {
      this.#body.innerHTML = step.html;
    } else if (step.text) {
      this.#body.textContent = step.text;
    }

    // Progress dots
    if (this.#opts.showProgress !== false && total > 1) {
      this.#progress.hidden = false;
      this.#progress.replaceChildren(
        ...enabled.map((_, i) => {
          const dot = document.createElement('span');
          dot.className = 'gp-dot';
          dot.dataset.state = i === position ? 'current' : i < position ? 'done' : 'todo';
          return dot;
        }),
      );
    } else {
      this.#progress.hidden = true;
      this.#progress.replaceChildren();
    }

    // Buttons
    const buttons = step.buttons ?? this.#defaultButtons(position, total);
    this.#actions.replaceChildren(...buttons.map((b) => this.#renderButton(b)));

    // Per-step classes
    this.#card.className = ['gp-card', step.classes].filter(Boolean).join(' ');
    this.#card.dataset.hasClose = String(this.#opts.showClose !== false);
    this.#card.dataset.placement = this.#placement(step);
  }

  #defaultButtons(position: number, total: number): StepButton[] {
    const buttons: StepButton[] = [];
    if (position > 0) {
      buttons.push({ label: this.#labels.back, action: 'back', variant: 'secondary' });
    }
    buttons.push({
      label: position === total - 1 ? this.#labels.done : this.#labels.next,
      action: position === total - 1 ? 'complete' : 'next',
      variant: 'primary',
    });
    return buttons;
  }

  #renderButton(button: StepButton): HTMLButtonElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = ['gp-btn', button.classes].filter(Boolean).join(' ');
    el.dataset.variant = button.variant ?? 'secondary';
    el.textContent = button.label;
    if (button.disabled) el.setAttribute('aria-disabled', 'true');
    el.addEventListener('click', () => {
      if (button.disabled) return;
      const action = button.action ?? 'next';
      if (typeof action === 'function') return action(this);
      if (action === 'next') void this.next();
      else if (action === 'back') void this.back();
      else if (action === 'cancel') void this.cancel();
      else if (action === 'complete') void this.complete();
    });
    return el;
  }

  // ---------------------------------------------------------------- position

  #placement(step: TourStep): Placement {
    if (!step.target && !this.#target) return 'center';
    return step.placement ?? this.#opts.placement ?? 'bottom';
  }

  #interactive(): boolean {
    if (this.#opts.blocking === false) return true;
    const step = this.current;
    return step?.interactive ?? this.#opts.interactive ?? true;
  }

  #animates(): boolean {
    const mode = this.#opts.animate ?? 'auto';
    if (mode === true) return true;
    if (mode === false) return false;
    return !prefersReducedMotion();
  }

  #applyAnchor(target: Element | null): void {
    this.#releaseAnchor();
    if (!target || !(target instanceof HTMLElement)) {
      this.#useAnchor = false;
      return;
    }

    const strategy = this.#opts.strategy ?? 'auto';
    const supported = supportsAnchorPositioning();
    this.#useAnchor =
      strategy === 'anchor'
        ? supported
        : strategy === 'js'
          ? false
          : supported && canAnchorTo(target, this.#card);

    if (!this.#useAnchor) return;

    this.#savedAnchorName = target.style.getPropertyValue('anchor-name') || '';
    target.style.setProperty('anchor-name', ANCHOR_NAME);
    this.#anchoredEl = target;

    this.#resizeObserver?.observe(target);
  }

  /**
   * Cleans up whichever element we actually anchored, which is tracked
   * separately from `#target` — by the time a step change releases the old
   * anchor, `#target` already points at the incoming element.
   */
  #releaseAnchor(): void {
    const el = this.#anchoredEl;
    if (el) {
      this.#resizeObserver?.unobserve(el);
      if (this.#savedAnchorName) {
        el.style.setProperty('anchor-name', this.#savedAnchorName);
      } else {
        el.style.removeProperty('anchor-name');
      }
    }
    this.#anchoredEl = null;
    this.#savedAnchorName = null;
  }

  /**
   * One pass: place the card, repaint the spotlight, move the ring, point the
   * arrow. Called on show and on every scroll/resize frame.
   */
  #update(): void {
    if (!this.#active || !this.#root) return;
    const step = this.current;
    if (!step) return;

    // `clientWidth/Height` excludes the scrollbar, which is what the fixed-position
    // scrim wants — but in quirks mode it reports the whole document instead of the
    // viewport, which would push the spotlight off screen. Take the smaller.
    const vw = Math.min(document.documentElement.clientWidth, window.innerWidth);
    const vh = Math.min(document.documentElement.clientHeight, window.innerHeight);
    const target = this.#target && this.#target.isConnected ? this.#target : null;
    const placement = this.#placement(step);

    // While the FLIP animation owns the card's transform, any measurement we
    // take is mid-flight — so leave the card and the arrow alone and only
    // refresh the spotlight. `#flip` calls back here when it lands.
    const animating = this.#card.dataset.animating === 'true';

    // --- card
    if (!animating) this.#positionCard(step, target, placement);

    // --- spotlight + ring
    let hole: SpotlightRect | null = null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const padding = step.padding ?? this.#opts.padding ?? 6;
      const radius = step.radius ?? this.#opts.radius ?? inferRadius(target);
      hole = padRect(rect, padding, radius, vw, vh);
    }

    this.#scrim.style.clipPath = cutoutPath(vw, vh, hole, this.#cutoutFormat);
    // Non-blocking tours never intercept a click; blocking + interactive tours
    // let the scrim swallow everything except the cutout; blocking + modal
    // tours hand that job to the invisible blocker so the cutout stays visible
    // without being clickable.
    this.#scrim.style.pointerEvents =
      this.#opts.blocking === false ? 'none' : this.#interactive() ? 'auto' : 'none';
    this.#root.dataset.interactive = String(this.#interactive());

    if (hole && hole.width > 0 && hole.height > 0) {
      this.#ring.dataset.empty = 'false';
      Object.assign(this.#ring.style, {
        left: `${hole.x}px`,
        top: `${hole.y}px`,
        width: `${hole.width}px`,
        height: `${hole.height}px`,
        borderRadius: `${hole.radius}px`,
      });
    } else {
      // Park the ring on the card's own centre while it is invisible. Its
      // left/top are transitioned, so leaving them unset means the next
      // targeted step animates the ring in from the viewport corner: it fades
      // up mid-flight and reads as a box flying across the screen.
      const rest = this.#card.getBoundingClientRect();
      Object.assign(this.#ring.style, {
        left: `${Math.round(rest.left + rest.width / 2)}px`,
        top: `${Math.round(rest.top + rest.height / 2)}px`,
        width: '0px',
        height: '0px',
      });
      this.#ring.dataset.empty = 'true';
    }

    // --- arrow (measured, because position-try can flip the card behind our back)
    if (animating) {
      // deferred until the animation lands
    } else if (target && placement !== 'center') {
      const cardRect = this.#card.getBoundingClientRect();
      const anchorRect = target.getBoundingClientRect();
      const side = resolveSide(cardRect, anchorRect);
      this.#card.dataset.side = side;
      const offset = arrowOffset(cardRect, anchorRect, side, ARROW_SIZE, ARROW_INSET);
      if (side === 'top' || side === 'bottom') {
        this.#arrow.style.left = `${offset}px`;
        this.#arrow.style.removeProperty('top');
      } else {
        this.#arrow.style.top = `${offset}px`;
        this.#arrow.style.removeProperty('left');
      }
      this.#arrow.hidden = false;
    } else {
      this.#arrow.hidden = true;
      this.#card.removeAttribute('data-side');
    }
  }

  #offset(step: TourStep): number {
    return step.offset ?? this.#opts.offset ?? 12;
  }

  #positionCard(step: TourStep, target: Element | null, placement: Placement): void {
    const card = this.#card;

    if (!target || placement === 'center') {
      card.style.removeProperty('position-anchor');
      card.style.removeProperty('position-area');
      card.style.removeProperty('position-try-fallbacks');
      card.style.margin = '0';
      card.style.left = '50%';
      card.style.top = '50%';
      card.style.translate = '-50% -50%';
      card.dataset.placement = 'center';
      return;
    }

    if (this.#useAnchor) {
      card.style.setProperty('position-anchor', ANCHOR_NAME);
      card.style.setProperty('position-area', positionArea(placement));
      card.style.setProperty(
        'position-try-fallbacks',
        'flip-block, flip-inline, flip-block flip-inline',
      );
      card.style.margin = `${this.#offset(step)}px`;
      card.style.removeProperty('left');
      card.style.removeProperty('top');
      card.style.removeProperty('translate');
      card.dataset.placement = placement;

      // Trust, then verify. If the anchor reference fails to resolve for any
      // reason — an engine quirk, a target that moved into a different
      // containing block, a name that was never applied — the card silently
      // falls back to `inset: auto` and parks in the viewport corner. A
      // resolved anchor always lands the card adjacent to its target, so a
      // large gap on both axes means the tether did not take.
      if (this.#anchorLooksResolved(target)) return;
      this.#useAnchor = false;
    }

    card.style.removeProperty('position-anchor');
    card.style.removeProperty('position-area');
    card.style.removeProperty('position-try-fallbacks');
    card.style.margin = '0';

    const anchorRect = target.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const pos = computePosition(
      anchorRect,
      { x: cardRect.x, y: cardRect.y, width: cardRect.width, height: cardRect.height },
      placement,
      this.#offset(step),
      8,
      step.fallbackPlacements ?? this.#opts.fallbackPlacements ?? [],
    );
    card.style.left = '0px';
    card.style.top = '0px';
    card.style.translate = `${Math.round(pos.x)}px ${Math.round(pos.y)}px`;
    card.dataset.placement = placement;
  }

  /**
   * Convert the card's current position into plain pixel coordinates, so it
   * stays exactly where it is no matter what happens to the anchor afterwards.
   */
  #freezeCard(): void {
    const card = this.#card;
    if (!card.matches(':popover-open')) return;

    const rect = card.getBoundingClientRect();
    card.getAnimations().forEach((a) => a.cancel());
    card.dataset.animating = 'false';
    card.style.removeProperty('position-anchor');
    card.style.removeProperty('position-area');
    card.style.removeProperty('position-try-fallbacks');
    card.style.margin = '0';
    card.style.left = '0px';
    card.style.top = '0px';
    card.style.translate = `${Math.round(rect.left)}px ${Math.round(rect.top)}px`;
  }

  #anchorLooksResolved(target: Element): boolean {
    const c = this.#card.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const slack = this.#offset(this.current ?? {}) + 96;
    const gapX = Math.max(t.left - c.right, c.left - t.right, 0);
    const gapY = Math.max(t.top - c.bottom, c.top - t.bottom, 0);
    return gapX <= slack && gapY <= slack;
  }

  /**
   * FLIP the card from where it was to where it now is, animating size as well
   * as position so the shell appears to morph rather than jump.
   */
  #flip(first: DOMRect): void {
    if (this.#opts.flip === false) return;
    const card = this.#card;
    const last = card.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(first.width - last.width) < 1) return;
    // Beyond a certain distance a glide stops reading as one object moving and
    // starts reading as something being thrown across the screen.
    if (Math.hypot(dx, dy) > 640) return;

    // Animate `transform`, not `translate`: the card's resting position lives
    // in `translate` (which may be a percentage, as in centred steps), and
    // `transform` composes on top of it without having to reason about units.
    card.dataset.animating = 'true';
    const animation = card.animate(
      [
        {
          transform: `translate(${dx}px, ${dy}px)`,
          width: `${first.width}px`,
          height: `${first.height}px`,
        },
        { transform: 'none', width: `${last.width}px`, height: `${last.height}px` },
      ],
      { duration: 380, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'none' },
    );
    animation.finished
      .catch(() => undefined)
      .finally(() => {
        card.dataset.animating = 'false';
        // Re-measure now that the card has settled, so the arrow points at the
        // target rather than at wherever the card was mid-flight.
        this.#update();
      });
  }

  // ---------------------------------------------------------------- a11y

  #applyInert(): void {
    if (this.#opts.blocking === false) {
      this.#inert.release();
      return;
    }
    const allowed: Array<Element | null> = [this.#root];
    if (this.#interactive() && this.#target) allowed.push(this.#target);
    this.#inert.apply(allowed, (this.#opts.container ?? document.body) as HTMLElement);
  }

  #focusStep(step: TourStep): void {
    const mode = step.focus ?? 'card';
    if (mode === 'none') return;

    if (mode === 'target' && this.#target instanceof HTMLElement) {
      this.#target.focus({ preventScroll: true });
      this.#announce();
      return;
    }

    const focusWasInside = this.#card.contains(document.activeElement);
    this.#card.focus({ preventScroll: true });

    // Moving focus into the dialog announces its name and description. If focus
    // was already inside (the user clicked Next), that announcement won't fire
    // again, so route the new step through the live region instead. Doing both
    // would double-announce.
    if (focusWasInside) this.#announce();
  }

  #announce(): void {
    const parts = [this.#counter.textContent, this.#title.textContent, this.#body.textContent]
      .filter((v) => v && v.trim())
      .join('. ');
    this.#live.textContent = '';
    // A frame's gap so assistive tech treats it as a fresh insertion.
    requestAnimationFrame(() => {
      this.#live.textContent = parts;
    });
  }

  // ---------------------------------------------------------------- events

  #onKeyDown = (event: KeyboardEvent): void => {
    if (!this.#active || this.#opts.keyboard === false) return;

    if (event.key === 'Escape') {
      if (this.#opts.exitOnEscape === false) return;
      event.preventDefault();
      event.stopPropagation();
      void this.cancel();
      return;
    }

    // Only claim arrow keys when focus is in the card and not in a field.
    const active = document.activeElement;
    if (!this.#card.contains(active)) return;
    if (
      active instanceof HTMLElement &&
      (active.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName))
    ) {
      return;
    }

    const enabled = this.#enabled();
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        void this.next();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        void this.back();
        break;
      case 'Home':
        event.preventDefault();
        if (enabled[0] !== undefined) void this.goTo(enabled[0]);
        break;
      case 'End':
        event.preventDefault();
        if (enabled.at(-1) !== undefined) void this.goTo(enabled.at(-1)!);
        break;
    }
  };

  #onViewportChange = (): void => this.#updater.run();

  #bindGlobal(): void {
    document.addEventListener('keydown', this.#onKeyDown, true);
    window.addEventListener('scroll', this.#onViewportChange, { capture: true, passive: true });
    window.addEventListener('resize', this.#onViewportChange, { passive: true });
  }

  #unbindGlobal(): void {
    document.removeEventListener('keydown', this.#onKeyDown, true);
    window.removeEventListener('scroll', this.#onViewportChange, true);
    window.removeEventListener('resize', this.#onViewportChange);
  }

  #bindAdvance(step: TourStep, target: Element | null): void {
    const spec = step.advanceOn;
    if (!spec) return;
    const el = spec.selector ? document.querySelector(spec.selector) : target;
    if (!el) return;
    const handler = (event: Event) => {
      if (spec.when && !spec.when(event)) return;
      void this.next();
    };
    el.addEventListener(spec.event, handler);
    this.#advanceCleanup = () => el.removeEventListener(spec.event, handler);
  }

  async #waitForCondition(
    condition: () => boolean | Promise<boolean>,
    signal: AbortSignal,
    timeout = 10_000,
  ): Promise<void> {
    const started = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (signal.aborted) return;
      if (await condition()) return;
      if (Date.now() - started > timeout) return;
      await nextFrame();
    }
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Create and immediately start a tour. */
export function startTour(options: TourOptions & { startAt?: number | string }): Tour {
  const tour = new Tour(options);
  void tour.start(options.startAt ?? 0);
  return tour;
}

export type { TourController, TourOptions, TourStep, StepButton, Placement, Side };
