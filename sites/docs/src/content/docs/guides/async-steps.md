---
title: Async steps
description: Waiting for a target, advancing on the real user action, and doing setup before a step runs.
---

## Waiting for a target

Menus that open, panels that lazy-render, routes that are still loading.
`waitFor` takes milliseconds to wait for the target to show up, or a
predicate to poll.

```js
{ target: '#invite-panel', waitFor: 3000, title: 'Invite your team' }

{ target: '#chart', waitFor: () => store.getState().loaded, title: 'Your data' }
```

The card stays hidden while it waits, so nothing hovers over a half-rendered
page. If the target never shows up, `onMissingTarget` decides what happens: skip
the step, show it centred, or throw.

## Advancing on the real action

Probably the most useful thing in the library. Skip the Next button and let the
step complete when the user does the thing.

```js
{
  target: '#search',
  title: 'Try a search',
  focus: 'target',
  advanceOn: { event: 'input', when: (e) => e.target.value.length > 2 },
}
```

There's a working `advanceOn` example over at
[the live demo](https://guidepost.live). Type three characters and the step
completes.

## Setting up before a step

```js
{
  target: '#settings-panel',
  beforeShow: async () => { router.push('/settings'); await nextPaint(); },
  afterHide:  () => router.back(),
}
```
