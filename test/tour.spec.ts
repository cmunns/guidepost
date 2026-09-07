import { expect, test, type Page } from '@playwright/test';

const DEMO = '/';

// The page pulls a web font off fonts.googleapis.com. Nothing under test cares
// about it, and waiting on a third party makes the suite slow and flaky when
// workers run in parallel, so serve the request locally as a no-op.
async function open(page: Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
  await page.goto(DEMO);
}

// The demo page keeps its Tour instance in a module-scoped local, so hook the
// class before anything launches and stash whatever gets started on `window`.
async function exposeTour(page: Page) {
  await page.waitForFunction(() => (window as any).__Tour !== undefined);
  await page.evaluate(() => {
    const Tour = (window as any).__Tour;
    if ((Tour as any).__hooked) return;
    (Tour as any).__hooked = true;
    const start = Tour.prototype.start;
    Tour.prototype.start = function (...args: unknown[]) {
      (window as any).__tour = this;
      return start.apply(this, args);
    };
  });
}

async function startTour(page: Page, selector = '#run-top') {
  await open(page);
  await exposeTour(page);
  await page.click(selector);
  await expect(page.locator('.gp-card')).toBeVisible();
  // Let the open transition and first layout pass settle.
  await page.waitForTimeout(450);
}

// The mode tabs only record what the *next* launch should use, so pick the tab
// and then press the run button.
async function startTourInMode(page: Page, mode: 'js' | 'open') {
  await open(page);
  await exposeTour(page);
  await page.click(`.tab[data-mode="${mode}"]`);
  await page.click('#run-top');
  await expect(page.locator('.gp-card')).toBeVisible();
  await page.waitForTimeout(450);
}

// The marketing page has no purpose-built below-the-fold target, so build one:
// a tall spacer plus a panel appended to the end of the document, driven by a
// two-step tour of our own. Same shape as the old fixture's `below` step.
async function startScrollTour(page: Page) {
  await open(page);
  await exposeTour(page);
  await page.evaluate(async () => {
    const spacer = document.createElement('div');
    spacer.id = 'far-spacer';
    spacer.style.height = '1400px';
    spacer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spacer);

    const below = document.createElement('section');
    below.id = 'far-below';
    below.textContent = 'Scroll target — a step down here proves the smooth-scroll handoff works.';
    Object.assign(below.style, { padding: '20px', margin: '0 40px', border: '1px solid #ccc' });
    document.body.appendChild(below);

    const tour = new (window as any).__Tour({
      id: 'scroll-scenario',
      steps: [
        { id: 'intro', title: 'Quick tour', text: 'Centred opener.', placement: 'center' },
        {
          id: 'rail',
          target: '#nav-carriers',
          title: 'Still clickable',
          text: 'A target that is plainly in view.',
          placement: 'right-start',
        },
        {
          id: 'below',
          target: '#far-below',
          title: 'Scrolling is handled',
          text: 'The tour scrolls the target into view and waits for the scroll to settle.',
          placement: 'top',
        },
      ],
    });
    void tour.start();
  });
  await expect(page.locator('.gp-card')).toBeVisible();
  await page.waitForTimeout(450);
}

test('the browser under test actually supports the native primitives', async ({ page }) => {
  await open(page);
  const support = await page.evaluate(() => ({
    popover: HTMLElement.prototype.hasOwnProperty('popover'),
    anchor: CSS.supports('anchor-name', '--x') && CSS.supports('position-area', 'top'),
    inert: 'inert' in HTMLElement.prototype,
    startingStyle: CSS.supports('transition-behavior', 'allow-discrete'),
  }));
  expect(support).toEqual({ popover: true, anchor: true, inert: true, startingStyle: true });
});

test('opens in the top layer with a correct accessible name', async ({ page }) => {
  await startTour(page);

  const card = page.locator('.gp-card');
  await expect(card).toHaveAttribute('role', 'dialog');
  // :popover-open only matches elements promoted to the top layer.
  expect(await card.evaluate((el) => el.matches(':popover-open'))).toBe(true);
  expect(await page.locator('.gp-scrim').evaluate((el) => el.matches(':popover-open'))).toBe(true);

  const name = await card.evaluate((el) => {
    const ids = (el.getAttribute('aria-labelledby') ?? '').split(' ').filter(Boolean);
    return ids.map((id) => document.getElementById(id)?.textContent?.trim()).join(' ');
  });
  expect(name).toBe('Step 1 of 6 Quick tour');
});

test('focus moves into the card and is restored on exit', async ({ page }) => {
  await startTour(page);
  expect(await page.evaluate(() => document.activeElement?.className)).toContain('gp-card');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('run-top');
  expect(await page.locator('.gp-card').evaluate((el) => el.matches(':popover-open'))).toBe(false);
});

test('inert contains focus without a hand-rolled trap', async ({ page }) => {
  await startTour(page);
  await page.evaluate(() => void (window as any).__tour.goTo('rail')); // #nav-carriers
  await page.waitForTimeout(700);

  const state = await page.evaluate(() => {
    const inertOf = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      return el ? el.closest('[inert]') !== null : null;
    };
    return {
      sidebarNeighbour: inertOf('#nav-shipments'),
      target: inertOf('#nav-carriers'),
      unrelated: inertOf('#stage-rows'),
      card: inertOf('.gp-card'),
    };
  });

  // Everything is inert except the ancestor chain of the spotlighted target
  // and the tour's own root.
  expect(state.sidebarNeighbour).toBe(true);
  expect(state.unrelated).toBe(true);
  expect(state.target).toBe(false);
  expect(state.card).toBe(false);
});

test('the clip-path cutout lets pointer events reach the spotlighted element', async ({ page }) => {
  await startTour(page);
  await page.evaluate(() => void (window as any).__tour.goTo('rail'));
  await page.waitForTimeout(700);

  const hit = await page.evaluate(() => {
    const target = document.querySelector('#nav-carriers')!;
    const r = target.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const outside = document.elementFromPoint(window.innerWidth - 20, window.innerHeight - 20);
    return {
      insideHole: el?.id ?? el?.className ?? null,
      outsideHole: (outside as HTMLElement | null)?.className ?? null,
    };
  });

  // Inside the cutout the real element is hit; outside it the scrim is.
  expect(hit.insideHole).toBe('nav-carriers');
  expect(hit.outsideHole).toContain('gp-scrim');
});

test('the spotlight path is well-formed and moves between steps', async ({ page }) => {
  await startTour(page);
  const clip = () => page.locator('.gp-scrim').evaluate((el) => getComputedStyle(el).clipPath);

  const first = await clip();
  expect(first).toContain('path(');

  await page.click('.gp-btn[data-variant="primary"]');
  await page.waitForTimeout(700);
  const second = await clip();
  expect(second).not.toBe(first);

  // Both paths must share a command sequence or the transition cannot interpolate.
  const commands = (p: string) => (p.match(/[MHVAZ]/g) ?? []).join('');
  expect(commands(second)).toBe(commands(first));
});

test('the card is tethered to its target and the arrow agrees', async ({ page }) => {
  await startTour(page);
  await page.evaluate(() => void (window as any).__tour.goTo('rail')); // right-start of #nav-carriers
  await page.waitForTimeout(700);

  const geometry = await page.evaluate(() => {
    const card = document.querySelector('.gp-card')!.getBoundingClientRect();
    const target = document.querySelector('#nav-carriers')!.getBoundingClientRect();
    return {
      side: (document.querySelector('.gp-card') as HTMLElement).dataset.side,
      cardLeft: card.left,
      targetRight: target.right,
      gap: card.left - target.right,
      verticalOverlap:
        Math.min(card.bottom, target.bottom) - Math.max(card.top, target.top),
    };
  });

  expect(geometry.side).toBe('right');
  expect(geometry.gap).toBeGreaterThan(0);
  expect(geometry.gap).toBeLessThan(40);
  expect(geometry.verticalOverlap).toBeGreaterThan(0);
});

test('keyboard: arrows step, Home/End jump', async ({ page }) => {
  await startTour(page);
  const counter = page.locator('.gp-counter');

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(700);
  await expect(counter).toHaveText('Step 2 of 6');

  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(700);
  await expect(counter).toHaveText('Step 1 of 6');

  await page.keyboard.press('End');
  await page.waitForTimeout(900);
  await expect(counter).toHaveText('Step 6 of 6');

  await page.keyboard.press('Home');
  await page.waitForTimeout(900);
  await expect(counter).toHaveText('Step 1 of 6');
});

test('progress dots reflect position', async ({ page }) => {
  await startTour(page);
  await expect(page.locator('.gp-dot')).toHaveCount(6);
  await expect(page.locator('.gp-dot[data-state="current"]')).toHaveCount(1);

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(700);
  const states = await page.locator('.gp-dot').evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).dataset.state),
  );
  expect(states[0]).toBe('done');
  expect(states[1]).toBe('current');
  expect(states[2]).toBe('todo');
});

test('advanceOn moves the tour when the user does the real thing', async ({ page }) => {
  await startTour(page);
  await page.evaluate(() => void (window as any).__tour.goTo('search'));
  await page.waitForTimeout(900);
  await expect(page.locator('.gp-counter')).toHaveText('Step 5 of 6');

  // The field is the focus target and stays interactive despite the tour blocking.
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('stage-search');
  await page.keyboard.type('quar');
  await page.waitForTimeout(900);
  await expect(page.locator('.gp-counter')).toHaveText('Step 6 of 6');
});

test('scrolls a below-the-fold target into view before positioning', async ({ page }) => {
  await startScrollTour(page);
  await page.evaluate(() => void (window as any).__tour.goTo('below'));
  await page.waitForTimeout(1600);

  const visible = await page.evaluate(() => {
    const r = document.querySelector('#far-below')!.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  });
  expect(visible).toBe(true);
});

test('the JS fallback strategy positions identically', async ({ page }) => {
  await startTourInMode(page, 'js');
  await page.evaluate(() => void (window as any).__tour.goTo('rail'));
  await page.waitForTimeout(700);

  const geometry = await page.evaluate(() => {
    const cardEl = document.querySelector('.gp-card') as HTMLElement;
    const card = cardEl.getBoundingClientRect();
    const target = document.querySelector('#nav-carriers')!.getBoundingClientRect();
    return {
      usesTranslate: cardEl.style.translate !== '',
      usesAnchor: cardEl.style.getPropertyValue('position-anchor') !== '',
      side: cardEl.dataset.side,
      gap: card.left - target.right,
      onScreen: card.left >= 0 && card.right <= window.innerWidth,
    };
  });

  expect(geometry.usesAnchor).toBe(false);
  expect(geometry.usesTranslate).toBe(true);
  expect(geometry.side).toBe('right');
  expect(geometry.gap).toBeGreaterThan(0);
  expect(geometry.onScreen).toBe(true);
});

test('non-blocking mode leaves the page alone', async ({ page }) => {
  await startTourInMode(page, 'open');
  const inertCount = await page.evaluate(() => document.querySelectorAll('[inert]').length);
  expect(inertCount).toBe(0);

  // Move off the centred opening step, which simply sits on top of the sandbox
  // panel; from here the card is tethered beside the rail and clear of it.
  await page.evaluate(() => void (window as any).__tour.goTo('rail'));
  await page.waitForTimeout(700);

  // The page underneath is still fully usable — no scrim, no blocker.
  await page.click('#nav-settings');
  expect(await page.locator('.gp-card').evaluate((el) => el.matches(':popover-open'))).toBe(true);
});

test('completing the tour tears everything down', async ({ page }) => {
  await startTour(page);
  await page.evaluate(() => void (window as any).__tour.complete());
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => ({
    open: document.querySelector('.gp-card')?.matches(':popover-open'),
    inert: document.querySelectorAll('[inert]').length,
    anchorNames: Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) =>
      el.style.getPropertyValue('anchor-name'),
    ).length,
  }));

  expect(state.open).toBe(false);
  expect(state.inert).toBe(0);
  expect(state.anchorNames).toBe(0);
});

test('missing targets are skipped rather than throwing', async ({ page }) => {
  await open(page);
  await exposeTour(page);
  await page.evaluate(() => {
    const { Tour } = window as any;
    const tour = new (window as any).__Tour({
      steps: [
        { title: 'One', text: 'first', placement: 'center' },
        { target: '#does-not-exist', title: 'Two', text: 'skipped' },
        { target: '#stage-new', title: 'Three', text: 'third' },
      ],
    });
    (window as any).__t2 = tour;
    tour.start();
    void Tour;
  });
  await page.waitForTimeout(400);
  await page.locator('.gp-btn[data-variant="primary"]').click();
  await page.waitForTimeout(800);

  await expect(page.locator('.gp-title')).toHaveText('Three');
});

// Regression: releasing `anchor-name` from the outgoing target before the
// async work left the card with a `position-anchor` resolving to nothing, so it
// laid out at the viewport origin for every frame until the next step landed.
test('the card never parks in the viewport corner during a step change', async ({ page }) => {
  await startScrollTour(page);

  const sample = (fn: string) =>
    page.evaluate(async (body) => {
      const card = document.querySelector('.gp-card')!;
      const frames: Array<{ x: number; y: number; opacity: number }> = [];
      let running = true;
      const tick = () => {
        const r = card.getBoundingClientRect();
        frames.push({ x: r.left, y: r.top, opacity: parseFloat(getComputedStyle(card).opacity) });
        if (running) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      // eslint-disable-next-line no-eval
      await eval(body);
      await new Promise((r) => setTimeout(r, 1600));
      running = false;
      return frames;
    }, fn);

  // A plain step change, and one that has to scroll the page a long way.
  for (const move of ['window.__tour.next()', "window.__tour.goTo('below')"]) {
    const frames = await sample(move);
    expect(frames.length).toBeGreaterThan(20);
    const parked = frames.filter((f) => f.opacity > 0.05 && f.x < 4 && f.y < 4);
    expect(parked).toEqual([]);
  }
});

test('exactly one element carries the anchor name at any time', async ({ page }) => {
  await startTour(page);
  const counts: number[] = [];
  for (const id of ['primitives', 'rail', 'tiles', 'search']) {
    await page.evaluate((s) => void (window as any).__tour.goTo(s), id);
    await page.waitForTimeout(1000);
    counts.push(
      await page.evaluate(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) =>
            el.style.getPropertyValue('anchor-name'),
          ).length,
      ),
    );
  }
  // Stale names on outgoing targets would make the anchor ambiguous.
  expect(counts).toEqual([1, 1, 1, 1]);
});

// Regression: the exit transition keeps the card on screen for a few hundred ms
// after hidePopover(), so releasing the anchor first made it jump to the corner
// and fade out from there.
test('the card fades out where it stood, not in the corner', async ({ page }) => {
  await startTour(page);
  await page.evaluate(() => void (window as any).__tour.goTo('rail'));
  await page.waitForTimeout(1100);

  const frames = await page.evaluate(async () => {
    const card = document.querySelector('.gp-card')!;
    // Track the centre, not the top-left: the exit transition scales the card
    // down, which moves its edges but leaves the centre where it was.
    const centre = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const start = centre(card);
    const seen: Array<{ x: number; y: number; opacity: number }> = [];
    let running = true;
    const tick = () => {
      const c = centre(card);
      seen.push({ ...c, opacity: parseFloat(getComputedStyle(card).opacity) });
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    await (window as any).__tour.complete();
    await new Promise((r) => setTimeout(r, 900));
    running = false;
    return { seen, start };
  });

  // While any part of the card is still painted, it must not have moved.
  const visible = frames.seen.filter((f) => f.opacity > 0.02);
  expect(visible.length).toBeGreaterThan(2);
  for (const f of visible) {
    expect(Math.abs(f.x - frames.start.x)).toBeLessThan(3);
    expect(Math.abs(f.y - frames.start.y)).toBeLessThan(3);
  }
});

test('a step that scrolls hides the card while the page moves', async ({ page }) => {
  await startScrollTour(page);
  const minOpacity = await page.evaluate(async () => {
    const card = document.querySelector('.gp-card')!;
    let min = 1;
    let running = true;
    const tick = () => {
      min = Math.min(min, parseFloat(getComputedStyle(card).opacity));
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    await (window as any).__tour.goTo('below');
    await new Promise((r) => setTimeout(r, 1600));
    running = false;
    return min;
  });
  expect(minOpacity).toBeLessThan(0.05);
});

test('a target that is already visible does not scroll the page', async ({ page }) => {
  await startTour(page);
  const scrolled = await page.evaluate(async () => {
    const before = window.scrollY;
    await (window as any).__tour.goTo('rail'); // #nav-carriers, plainly in view
    await new Promise((r) => setTimeout(r, 900));
    return Math.abs(window.scrollY - before);
  });
  expect(scrolled).toBeLessThan(2);
});

test('recovers when a forced anchor cannot resolve', async ({ page }) => {
  await open(page);
  await exposeTour(page);
  await page.evaluate(async () => {
    // Appended after the tour root, so it can never be a valid anchor: an
    // element may only be anchored to something that precedes it. It is also
    // added late, so the step has to wait for it.
    const tour = new (window as any).__Tour({
      strategy: 'anchor', // force the native path even though it cannot work
      steps: [
        {
          target: '#late-target',
          title: 'Late',
          text: 'Anchored the hard way.',
          waitFor: 3000,
        },
      ],
    });
    (window as any).__t3 = tour;
    const started = tour.start();
    setTimeout(() => {
      const late = document.createElement('button');
      late.id = 'late-target';
      late.textContent = 'Late';
      Object.assign(late.style, { position: 'fixed', left: '420px', top: '360px' });
      document.body.appendChild(late);
    }, 150);
    await started;
  });
  await page.waitForTimeout(900);

  const geometry = await page.evaluate(() => {
    const card = document.querySelector('.gp-card')!.getBoundingClientRect();
    const target = document.querySelector('#late-target')!.getBoundingClientRect();
    return {
      atOrigin: card.left < 4 && card.top < 4,
      gap: card.top - target.bottom,
      overlap: Math.min(card.right, target.right) - Math.max(card.left, target.left),
    };
  });

  expect(geometry.atOrigin).toBe(false);
  expect(geometry.gap).toBeGreaterThan(0);
  expect(geometry.gap).toBeLessThan(40);
  expect(geometry.overlap).toBeGreaterThan(0);
});

test('reduced motion collapses every duration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startTour(page);
  const durations = await page.evaluate(() => {
    const read = (sel: string) => getComputedStyle(document.querySelector(sel)!).transitionDuration;
    return { card: read('.gp-card'), scrim: read('.gp-scrim'), ring: read('.gp-ring') };
  });
  for (const value of Object.values(durations)) {
    expect(value.split(',').every((d) => parseFloat(d) <= 0.001)).toBe(true);
  }
});
