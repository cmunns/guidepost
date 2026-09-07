---
title: Browser support
description: What's required with no fallback, and the one piece (CSS anchor positioning) that has one.
---

Required, no fallback: the Popover API, `inert`, and
`clip-path: path()`. That puts the floor at roughly Chrome 117,
Safari 17.5 and Firefox 129.

CSS anchor positioning is the one piece that isn't everywhere yet
(Chrome 125+, Safari 26+, Firefox 147+), and the one piece with a fallback.
`strategy: 'auto'` uses the native tether where it exists and a
measured positioner everywhere else. It also verifies the anchor actually
resolved, and falls back mid-step if it didn't.

```js
import { supportsAnchorPositioning } from '@cmunns/guidepost';

supportsAnchorPositioning(); // true on the native path
```

[the live demo](https://guidepost.live) tells you which path your browser is on.
