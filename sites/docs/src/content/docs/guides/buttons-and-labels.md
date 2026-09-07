---
title: Buttons and labels
description: Replace the default button row per step, and override every string the card renders.
---

The default row is Back plus Next, with Next becoming Done on the last step.
Replace it per step:

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
`ghost`. A disabled button gets `aria-disabled` rather than
`disabled`, so it stays reachable and can still be read.

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

A German-language tour is among the live examples at
[the live demo](https://guidepost-demo.vercel.app).
</content>
