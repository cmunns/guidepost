---
title: Browser support
description: What is required with no fallback, and the one piece — CSS anchor positioning — that has one.
---

Required, with no fallback: the Popover API, `inert`, and
`clip-path: path()`. That puts the floor at roughly Chrome 117,
Safari 17.5 and Firefox 129.

CSS anchor positioning is the one piece that is not everywhere yet
(Chrome 125+, Safari 26+, Firefox 147+), and the one piece with a fallback.
`strategy: 'auto'` uses the native tether where it exists and a
measured positioner everywhere else — and it verifies the anchor actually
resolved, falling back mid-step if it did not.

```js
import { supportsAnchorPositioning } from '@cmunns/guidepost';

supportsAnchorPositioning(); // true on the native path
```

[the live demo](https://guidepost-demo.vercel.app) reports which path your browser is on.
</content>
