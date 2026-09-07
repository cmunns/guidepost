---
title: Methods
description: The Tour instance methods, the getters, and the two static helpers behind remember.
---

| Method | Returns | |
| --- | --- | --- |
| `start(at?)` | `Promise` | Opens the tour. `at` is a step index or id. |
| `next()` / `back()` | `Promise` | Move one step, skipping any whose `when()` is false. |
| `goTo(indexOrId)` | `Promise` | Jump to a step. |
| `complete()` / `cancel()` | `Promise` | End the tour. Only `complete()` counts for `remember`. |
| `refresh()` | `void` | Recompute position and spotlight without changing step. |
| `destroy()` | `void` | Ends the tour and rips out its DOM. Call this on unmount. |
| `index` / `current` / `isActive` | getters | Current state. |
| `Tour.hasCompleted(id)` | `boolean` | Static. Reads the `remember` flag. |
| `Tour.clearCompleted(id)` | `void` | Static. Lets a user replay the tour. |
