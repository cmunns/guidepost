---
title: Troubleshooting
description: Common symptoms when a tour misbehaves, and the cause behind each one.
---

| Symptom | Cause |
| --- | --- |
| Card in the corner | The target was removed while the step was open. Give the step a `waitFor`, or use `onMissingTarget: 'center'`. |
| Page stays inert | `destroy()` was never called, usually a component that unmounted mid-tour. |
| Target is not clickable | `interactive: false` is set on the tour or the step. |
| Card under a modal | The other modal is in the top layer too and opened later. Start the tour after it, or use a `beforeShow` that closes it. |
| No animation | The OS is set to reduce motion, which is working as intended. `animate: true` overrides it — think hard before you do. |
| Arrow points at nothing | The target moved after the step opened. Call `tour.refresh()`, or check for a CSS transition on the target. |
</content>
