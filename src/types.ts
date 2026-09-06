/** Physical side the step card sits on, relative to its target. */
export type Side = 'top' | 'right' | 'bottom' | 'left';

/** Alignment along the cross axis of the chosen side. */
export type Align = 'start' | 'center' | 'end';

/**
 * Where the card goes. `center` detaches the card from any target and
 * centres it in the viewport (useful for intro/outro steps).
 */
export type Placement =
  | Side
  | `${Side}-${Align}`
  | 'center';

/**
 * How the card is tethered to its target.
 * - `auto`   use CSS anchor positioning when the browser supports it and the
 *            target precedes the card in DOM order, else fall back to JS.
 * - `anchor` force CSS anchor positioning.
 * - `js`     force the measured `position: fixed` fallback.
 */
export type PositionStrategy = 'auto' | 'anchor' | 'js';

/** Anything that can resolve to a target element. */
export type StepTarget =
  | string
  | Element
  | (() => Element | null | undefined)
  | null;

export interface StepButton {
  /** Visible label. */
  label: string;
  /** Built-in action, or a custom handler. */
  action?: 'next' | 'back' | 'cancel' | 'complete' | ((tour: TourController) => void);
  /** Extra class names for styling hooks. */
  classes?: string;
  /** Visual weight. Defaults to `secondary` for back, `primary` for next. */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Rendered with `aria-disabled` rather than `disabled` so it stays focusable. */
  disabled?: boolean;
}

/** Advance the tour when the user actually performs the action being taught. */
export interface AdvanceOn {
  /** Element to listen on. Defaults to the step's target. */
  selector?: string;
  /** DOM event name, e.g. `click`, `input`, `submit`. */
  event: string;
  /** Only advance when this returns true. */
  when?: (event: Event) => boolean;
}

export interface TourStep {
  /** Stable id. Used by `goTo`, deep links, and analytics callbacks. */
  id?: string;
  /** What to point at. Omit (or pass null) for a centred, targetless step. */
  target?: StepTarget;
  /** Heading. Becomes part of the card's accessible name. */
  title?: string;
  /** Body copy, inserted as text. Use `html` if you need markup. */
  text?: string;
  /** Body copy as trusted HTML, or an element to adopt. Bypasses `text`. */
  html?: string | HTMLElement;
  /** Preferred placement. Defaults to the tour-level `placement`. */
  placement?: Placement;
  /** Ordered placements to try when the preferred one does not fit (JS strategy). */
  fallbackPlacements?: Placement[];
  /** Gap between target and card, in px. */
  offset?: number;
  /** Extra breathing room around the spotlight cutout, in px. */
  padding?: number;
  /** Spotlight corner radius, in px. Defaults to the target's own radius. */
  radius?: number;
  /** Let the user interact with the spotlighted element. Overrides tour default. */
  interactive?: boolean;
  /** Replace the default button row. */
  buttons?: StepButton[];
  /** Scroll the target into view before showing. Default true. */
  scrollTo?: boolean;
  /**
   * Wait for the target (or an arbitrary condition) before showing.
   * A number is a timeout in ms for the target to appear. Default 0 — no wait.
   */
  waitFor?: number | (() => boolean | Promise<boolean>);
  /** Advance automatically when the user performs the real action. */
  advanceOn?: AdvanceOn;
  /** Runs before the step renders. Return a promise to delay it. */
  beforeShow?: (tour: TourController) => void | Promise<void>;
  /** Runs after the step is torn down. */
  afterHide?: (tour: TourController) => void | Promise<void>;
  /** Extra class names applied to the card for this step. */
  classes?: string;
  /** Where focus lands when the step opens. Default `card`. */
  focus?: 'card' | 'target' | 'none';
  /** Skip this step entirely when this returns false. */
  when?: () => boolean;
}

export interface TourLabels {
  next: string;
  back: string;
  done: string;
  close: string;
  /** Builds the card's counter text, e.g. "Step 2 of 5". */
  counter: (index: number, total: number) => string;
  /** Accessible name for the progress dots. */
  progress: string;
}

export interface TourOptions {
  steps: TourStep[];
  /** Stable id, used for `localStorage` completion tracking. */
  id?: string;
  /**
   * Make the rest of the page non-interactive while the tour runs.
   * Implemented with the native `inert` attribute, which also hides that
   * content from assistive technology. Default true.
   */
  blocking?: boolean;
  /**
   * Keep the spotlighted element interactive, so users can complete the real
   * action the step is describing. Default true. Ignored when `blocking` is false.
   */
  interactive?: boolean;
  placement?: Placement;
  fallbackPlacements?: Placement[];
  offset?: number;
  padding?: number;
  radius?: number;
  strategy?: PositionStrategy;
  /** Handle Escape / arrow keys / Home / End. Default true. */
  keyboard?: boolean;
  /** Escape cancels the tour. Default true. */
  exitOnEscape?: boolean;
  /** Clicking the dimmed area cancels the tour. Default false. */
  exitOnOverlayClick?: boolean;
  /** Show the × in the card corner. Default true. */
  showClose?: boolean;
  /** Show the progress dots. Default true. */
  showProgress?: boolean;
  /** Show the "Step n of m" line. Default true. */
  showCounter?: boolean;
  /**
   * `auto` honours `prefers-reduced-motion`, `true` always animates,
   * `false` never does. Default `auto`.
   */
  animate?: boolean | 'auto';
  /**
   * Morph the card between steps with a FLIP animation (Web Animations API):
   * the shell glides and resizes while the content cross-fades. Default true.
   */
  flip?: boolean;
  /** Inject the default stylesheet. Set false if you import the CSS yourself. Default true. */
  injectStyles?: boolean;
  /** Where the tour DOM is appended. Default `document.body`. */
  container?: HTMLElement;
  /** What to do when a step's target cannot be found. Default `skip`. */
  onMissingTarget?: 'skip' | 'center' | 'error';
  /** Remember completion in localStorage under `guidepost:<id>`. Default false. */
  remember?: boolean;
  labels?: Partial<TourLabels>;
  onStart?: (tour: TourController) => void;
  onShow?: (tour: TourController, step: TourStep, index: number) => void;
  onComplete?: (tour: TourController) => void;
  onCancel?: (tour: TourController) => void;
  onDestroy?: (tour: TourController) => void;
}

/** The subset of `Tour` handed to callbacks and button actions. */
export interface TourController {
  readonly steps: TourStep[];
  readonly index: number;
  readonly current: TourStep | null;
  readonly isActive: boolean;
  next(): Promise<void>;
  back(): Promise<void>;
  goTo(indexOrId: number | string): Promise<void>;
  complete(): Promise<void>;
  cancel(): Promise<void>;
  /** Recompute position and spotlight without changing step. */
  refresh(): void;
}
