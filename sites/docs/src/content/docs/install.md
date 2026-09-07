---
title: Install
description: Grab it from npm. ESM and CJS, TypeScript types included, and the CSS shows up on its own.
---

```bash
npm install @cmunns/guidepost
```

Ships ESM and CJS with TypeScript types. The stylesheet gets injected the first
time you use it. Want to own your CSS pipeline? Import it yourself and pass
`injectStyles: false`:

```js
// only if you set injectStyles: false
import '@cmunns/guidepost/guidepost.css';
```
