---
title: Install
description: Install Guidepost from npm. Ships ESM and CJS with TypeScript types, and injects its stylesheet automatically on first use.
---

```bash
npm install @cmunns/guidepost
```

Ships ESM and CJS with TypeScript types. The stylesheet is injected automatically
on first use — if you would rather own the CSS pipeline, import it yourself
and pass `injectStyles: false`:

```js
// only if you set injectStyles: false
import '@cmunns/guidepost/guidepost.css';
```
</content>
