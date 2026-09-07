---
title: Buttons and labels
description: Swap out the default button row per step, and override every string the card renders.
---

By default you get Back plus Next, and Next turns into Done on the last step.
Swap that out per step:

```js
{
  target: '#billing',
  buttons: [
    { label: 'Not now', action: 'cancel', variant: 'ghost' },
    { label: 'Skip ahead', action: (tour) => tour.goTo('summary') },
    { label: 'Upgrade', action: (tour) => { openBilling(); tour.complete(); }, variant: 'primary' },
  ],
}
```

`action` is `'next'`, `'back'`,
`'cancel'`, `'complete'`, or your own function.
`variant` is `primary`, `secondary` or
`ghost`. A disabled button gets `aria-disabled` and not the real
`disabled` attribute, so it stays reachable and screen readers can still read it.

## Every string is yours

```js
new Tour({
  steps,
  labels: {
    next: 'Weiter',
    back: 'Zurück',
    done: 'Fertig',
    close: 'Tour schließen',
    counter: (i, total) => `Schritt ${i + 1} von ${total}`,
  },
});
```

There's a German-language tour in the live examples at
[the live demo](https://guidepost.live).
