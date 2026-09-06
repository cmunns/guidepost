# Guidepost

Accessible product tours built on native browser primitives. No positioning
library, no portals, no z-index war, no hand-rolled focus trap.

**MIT licensed.** 9.1 KB minified + gzipped, stylesheet included. Zero runtime
dependencies.

```bash
npm install guidepost
```

```js
import { Tour } from 'guidepost';

const tour = new Tour({
  id: 'onboarding',
  steps: [
    { title: 'Welcome', text: 'A quick tour.', placement: 'center' },
    { target: '#sidebar', title: 'Navigation', text: 'Everything lives here.', placement: 'right-start' },
    { target: '#search', title: 'Try it', text: 'Type to continue.', focus: 'target',
      advanceOn: { event: 'input', when: (e) => e.target.value.length > 2 } },
  ],
});

tour.start();
```

---

## Why this exists

Shepherd.js is dual-licensed AGPL-3.0 / commercial — a paid licence is required
if your organisation generates revenue, including for internal tools. Intro.js
uses the same model. That is a fine business, but it is a licence decision, not
a technical one, and the technical work it was hiding has mostly moved into the
browser.

What used to require a library:

| Job | Then | Now |
| --- | --- | --- |
| Render above everything | z-index escalation, portals, `overflow: hidden` escapes | **Popover API** — top layer |
| Tether a card to an element | Popper / Floating UI + scroll & resize listeners | **CSS anchor positioning** — the browser keeps it attached |
| Dim the page with a hole in it | Four positioned divs framing the target | **`clip-path`** — one element, and the hole is click-through for free |
| Contain focus | Sentinel nodes, `keydown` interception, `aria-hidden` sweeps | **`inert`** — untabbable, unclickable, and hidden from screen readers |
| Animate a top-layer element out | `setTimeout` matched to the CSS duration | **`@starting-style`** + `transition-behavior: allow-discrete` |

What is left — the step machine and the accessibility contract — is what this
package is.

## How it compares

Measured from each library's published bundle rather than its documentation.
Own bundle, minified and gzipped, with any shipped stylesheet included.

| Library | Own bundle | Deps | Licence | `inert` | `aria-live` | Reduced motion |
| --- | --- | --- | --- | --- | --- | --- |
| @reactour/tour 3.8 | 6.5 kB | 3 | MIT | – | – | – |
| driver.js 1.8 | 7.9 kB | 0 | MIT | – | – | – |
| **guidepost 0.1.1** | **9.4 kB** | **0** | **MIT** | **yes** | **yes** | **yes** |
| shepherd.js 15.3 | 16.2 kB | 2 | AGPL-3.0 | – | – | – |
| tourguidejs 1.1 | 17.6 kB | 0 | BSD-3 | – | – | – |
| intro.js 8.5 | 19.3 kB | 0 | AGPL-3.0 | – | – | – |
| react-joyride 3.2 | 19.9 kB | 10 | MIT | – | yes | – |

Driver.js is smaller, and it is the right choice if you only need element
spotlighting. Guidepost's 1.5 kB buys the focus contract: `inert` containment,
a live region for step changes, and an animation that stops when the user has
asked for less motion.

Reproduce the table yourself — no numbers here come from anyone's marketing:

```bash
npm i --no-save driver.js shepherd.js intro.js react-joyride @reactour/tour tourguidejs
npm run compare
```

A regex probe proves a primitive is *used*, not that it is used correctly. This
is evidence, not an audit.

## Design notes

**The spotlight is one element.** A full-viewport div with a `clip-path`
containing a clockwise outer rectangle and a counter-clockwise rounded-rect
hole. Two things fall out of that:

- Clipping affects hit testing, so the hole passes clicks through to the real
  element underneath. That is what makes an *interactive* tour possible —
  users can complete the action the step is describing.
- Every path this library emits uses an identical command sequence, including
  the targetless case (a zero-size hole), so `clip-path` interpolates and the
  spotlight glides between steps as a plain CSS transition.

**`inert` is the focus trap.** Rather than intercepting Tab, the tour marks
every element inert *except* the ancestor path to the card and, in interactive
mode, the ancestor path to the spotlighted target. Tab order then does the
right thing by itself, and because `inert` removes content from the
accessibility tree, screen readers see only the card and the thing it points
at. `aria-modal` is set only in fully blocking mode, where it is true.

**Step changes are FLIP, not View Transitions.** The card's shell glides and
resizes via the Web Animations API while the content cross-fades, so a step
change reads as one object moving. View Transitions would be the obvious tool,
but they do not compose reliably with top-layer elements yet; FLIP gets the
same result with no caveats. The animation targets `transform`, not
`translate` — the card's resting position lives in `translate` (a percentage,
for centred steps), and `transform` composes on top of it rather than fighting
a CSS transition over the same property.

**Nothing intermediate is ever on screen.** A step change fades the card's
content out *before* any async work begins, and the anchor stays attached to
the outgoing target until the incoming one is ready — an unanchored fixed
element with `inset: auto` lays out in the viewport corner, and that would be
visible for every frame of a `beforeShow` promise or a smooth scroll. When the
change involves work that outlasts a frame — a scroll, a `waitFor`, an async
`beforeShow` — the shell fades too, so the card is never left hovering over a
page that is moving underneath it, and it fades back in at its new home instead
of flying across the viewport.

**Scrolling only when scrolling is needed.** A target that is already fully
visible does not move the page. Re-centring something the user can already see
is the single most common way a tour feels janky.

**Announcements do not double up.** Moving focus into the card announces its
name and description. When the user clicks *Next*, focus is already inside, so
that announcement will not fire again — those step changes are routed through a
polite live region instead. The step counter is part of the card's
`aria-labelledby`, so it reads as *"Step 2 of 5, Invite your team"* rather than
arriving as a separate interruption.

## Browser support

| Feature | Chrome | Safari | Firefox | Fallback |
| --- | --- | --- | --- | --- |
| Popover API | 114+ | 17+ | 125+ | none — required |
| `inert` | 102+ | 15.5+ | 112+ | none — required |
| `clip-path: path()` | 88+ | 13.1+ | 97+ | none — required |
| `@starting-style` | 117+ | 17.5+ | 129+ | animation degrades, layout unaffected |
| CSS anchor positioning | 125+ | 26+ | 147+ | **measured JS positioning** |

Anchor positioning is the only piece not yet everywhere, and it is the only one
with a fallback: `strategy: 'auto'` (the default) uses the native tether where
it exists and a `getBoundingClientRect` positioner with flip/shift everywhere
else. `supportsAnchorPositioning()` is exported if you want to report which
path you are on.

The baseline for the library as a whole is therefore roughly Chrome 117+,
Safari 17.5+, Firefox 129+.

## API

### `new Tour(options)`

| Option | Type | Default | |
| --- | --- | --- | --- |
| `steps` | `TourStep[]` | — | required |
| `id` | `string` | — | used by `remember` |
| `blocking` | `boolean` | `true` | apply `inert` to the rest of the page |
| `interactive` | `boolean` | `true` | keep the spotlighted element usable |
| `placement` | `Placement` | `'bottom'` | default for all steps |
| `fallbackPlacements` | `Placement[]` | `[]` | tried in order (JS strategy) |
| `offset` | `number` | `12` | gap between target and card |
| `padding` | `number` | `6` | breathing room around the cutout |
| `radius` | `number` | target's own | spotlight corner radius |
| `strategy` | `'auto' \| 'anchor' \| 'js'` | `'auto'` | |
| `keyboard` | `boolean` | `true` | Escape, arrows, Home/End |
| `exitOnEscape` | `boolean` | `true` | |
| `exitOnOverlayClick` | `boolean` | `false` | requires `blocking` |
| `showClose` / `showProgress` / `showCounter` | `boolean` | `true` | |
| `animate` | `boolean \| 'auto'` | `'auto'` | `'auto'` honours `prefers-reduced-motion` |
| `flip` | `boolean` | `true` | morph the card between steps |
| `injectStyles` | `boolean` | `true` | set false and import `guidepost/guidepost.css` |
| `container` | `HTMLElement` | `document.body` | |
| `onMissingTarget` | `'skip' \| 'center' \| 'error'` | `'skip'` | |
| `remember` | `boolean` | `false` | writes `guidepost:<id>` to localStorage |
| `labels` | `Partial<TourLabels>` | English | every string is overridable |

Callbacks: `onStart`, `onShow(tour, step, index)`, `onComplete`, `onCancel`,
`onDestroy`.

### `TourStep`

| Field | Type | |
| --- | --- | --- |
| `id` | `string` | for `goTo('id')` and analytics |
| `target` | `string \| Element \| () => Element \| null` | omit for a centred step |
| `title` / `text` | `string` | `text` is inserted as text, not HTML |
| `html` | `string \| HTMLElement` | escape hatch for markup |
| `placement`, `offset`, `padding`, `radius`, `interactive` | | per-step overrides |
| `buttons` | `StepButton[]` | replaces the default row |
| `scrollTo` | `boolean` | default true; only scrolls if the target is clipped, and waits for the scroll to settle |
| `waitFor` | `number \| () => boolean \| Promise<boolean>` | wait for a lazily rendered target |
| `advanceOn` | `{ selector?, event, when? }` | advance on the real user action |
| `beforeShow` / `afterHide` | `(tour) => void \| Promise<void>` | |
| `focus` | `'card' \| 'target' \| 'none'` | default `'card'` |
| `when` | `() => boolean` | skip the step conditionally |
| `classes` | `string` | styling hook |

### Methods

`start(at?)` · `next()` · `back()` · `goTo(indexOrId)` · `complete()` ·
`cancel()` · `refresh()` · `destroy()`

`Tour.hasCompleted(id)` and `Tour.clearCompleted(id)` are static.

## Keyboard

| Key | |
| --- | --- |
| `Escape` | cancel (anywhere, including while focus is on the target) |
| `→` / `←` | next / back — only when focus is in the card and not in a field |
| `Home` / `End` | first / last step |
| `Tab` | cycles the card, plus the target in interactive mode |

## Styling

Everything is a custom property on `.gp-card` (and `.gp-scrim` for the dim).
Light and dark are both defined; override either.

```css
.gp-card {
  --gp-accent: #0f766e;
  --gp-surface: #fff;
  --gp-radius: 10px;
  --gp-card-width: 24rem;
}
.gp-scrim { --gp-overlay: rgb(0 0 0 / 0.5); }
.gp-ring  { --gp-ring-halo: rgb(15 118 110 / 0.3); }
```

Class hooks: `.gp-scrim`, `.gp-ring`, `.gp-card`, `.gp-arrow`, `.gp-counter`,
`.gp-title`, `.gp-body`, `.gp-progress`, `.gp-dot`, `.gp-actions`, `.gp-btn`,
`.gp-close`. Each also carries a `part` attribute for future shadow-DOM use.

## Development

```bash
npm install
npm run build      # dist/ (esm + cjs + d.ts + guidepost.css)
npm run typecheck
npm test           # Playwright, real Chromium
npx http-server . && open demo/index.html
```

The test suite drives a real browser and asserts the things that are easy to
get wrong: that the card is genuinely in the top layer, that focus lands and is
restored, that `inert` covers everything except the target's ancestor chain,
that `elementFromPoint` inside the cutout returns the real element, that both
spotlight paths share a command sequence so they can interpolate, and that
`prefers-reduced-motion` collapses every duration.

Several tests sample the card frame by frame across a step change, because the
failure modes here are transient: a card that parks in the viewport corner for
200ms, a page that scrolls when it did not need to, an arrow measured
mid-flight. None of those show up in an end-state assertion.

## Licence

MIT.
