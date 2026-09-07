---
title: Accessibility
description: What the library guarantees around focus, inert, announcements and reduced motion, plus the parts that are still on you.
---

What the library guarantees:

- Focus moves into the card on open and goes back to the triggering element when
  you exit.
- Everything except the card is `inert`, meaning untabbable, unclickable, and
  hidden from screen readers. In interactive mode the spotlighted target is
  exempt too. No keydown interception, no sentinel nodes.
- The step counter is part of the card's accessible name, so it reads as
  *"Step 2 of 5, Invite your team"* in one go and doesn't arrive as a separate
  interruption. If focus is already inside the card, step changes route through a
  polite live region so nothing gets announced twice.
- Escape always exits, from anywhere, even while focus is on the target.
- `aria-modal` is set only in fully blocking mode.
- Every animation collapses under `prefers-reduced-motion`.

:::caution[The parts that are still on you.]
Write step text that makes sense read
aloud without the visual spotlight. "The button below" means nothing to a
screen-reader user. Give every target an accessible name. And if a step teaches a
drag interaction, give people a keyboard path to the same outcome.

No library can make your integration conformant. All it can do is stop being the
reason it isn't.
:::
