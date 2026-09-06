---
title: Quick start
description: A tour is an array of steps and a call to start(). That is the whole minimum.
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

That is the whole minimum. Focus moves into the card, the rest of the page goes
inert, Escape exits, arrow keys move between steps, and the spotlighted element
stays clickable.

You can try this tour, and every other example in these docs, at
[guidepost.dev](https://guidepost.dev).
</content>
