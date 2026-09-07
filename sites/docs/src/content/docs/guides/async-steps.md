---
title: Async steps
description: Waiting for a target, advancing on the real user action, and setting up before a step runs.
---

## Waiting for a target

Menus that open, panels that lazy-render, routes that are still loading.
`waitFor` takes milliseconds to wait for the target to appear, or a
predicate to poll.

```js
{ target: '#invite-panel', waitFor: 3000, title: 'Invite your team' }

{ target: '#chart', waitFor: () => store.getState().loaded, title: 'Your data' }
```

The card is hidden while it waits, so nothing hovers over a half-rendered page.
If the target never arrives, `onMissingTarget` decides: skip the step,
show it centred, or throw.

## Advancing on the real action

The most useful thing in the library. Rather than a Next button, the step completes
when the user does the thing.

```js
{
  target: '#search',
  title: 'Try a search',
  focus: 'target',
  advanceOn: { event: 'input', when: (e) => e.target.value.length > 2 },
}
```

There is a working `advanceOn` example — type three characters and the step
completes — at [the live demo](https://guidepost-demo.vercel.app).

## Setting up before a step

```js
{
  target: '#settings-panel',
  beforeShow: async () => { router.push('/settings'); await nextPaint(); },
  afterHide:  () => router.back(),
}
```
</content>
