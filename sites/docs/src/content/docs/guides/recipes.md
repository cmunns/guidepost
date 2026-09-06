---
title: Recipes
description: Show a tour once per user, deep-link a step, clean up on unmount, and skip steps conditionally.
---

## Show it once per user

```js
if (!Tour.hasCompleted('onboarding')) {
  new Tour({ id: 'onboarding', remember: true, steps }).start();
}

// a "replay tour" menu item
Tour.clearCompleted('onboarding');
```

## Deep-link a step

```js
const step = new URL(location.href).searchParams.get('tour');
if (step) tour.start(step); // start(at) takes a step id
```

## Clean up on unmount

```js
// React
useEffect(() => {
  const tour = new Tour({ steps });
  tour.start();
  return () => tour.destroy();
}, []);
```

`destroy()` ends the tour, releases `inert`, restores the
anchor name on the target and removes the DOM. Always call it — a tour that
outlives its page leaves the page inert.

## Conditional steps

```js
{ target: '#admin-panel', when: () => user.isAdmin, title: 'Admin tools' }
```

Skipped steps do not count towards the step total, so a five-step tour that skips
two reads "Step 2 of 3" rather than leaving gaps.
</content>
