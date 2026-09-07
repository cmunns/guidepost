---
title: Quick start
description: An array of steps, a call to start(), and you're done.
---

A tour is an array of steps and a call to `start()`.

```js
import { Tour } from '@cmunns/guidepost';

const tour = new Tour({
  steps: [
    { title: 'Welcome', text: 'A quick tour.', placement: 'center' },
    { target: '#sidebar', title: 'Navigation', text: 'Everything lives here.' },
    { target: '#new-button', title: 'Create', text: 'Start here when you are ready.' },
  ],
});

tour.start();
```

That's the whole thing. Focus jumps into the card, the rest of the page goes
inert, Escape gets you out, arrow keys move around, and the highlighted element
stays clickable.

You can play with this tour, and every other example in these docs, over at
[the live demo](https://guidepost.live).
