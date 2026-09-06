---
title: Accessibility
description: What the library guarantees about focus, inert, announcements and reduced motion — and what is still yours.
---

What the library guarantees:

- Focus moves into the card on open and returns to the triggering element on exit.
- Everything except the card — and, in interactive mode, the spotlighted target
  — is `inert`: untabbable, unclickable, and hidden from screen readers.
  There is no keydown interception and no sentinel nodes.
- The step counter is part of the card's accessible name, so it reads as
  *"Step 2 of 5, Invite your team"* rather than arriving as a separate
  interruption. When focus is already inside the card, step changes route through a
  polite live region instead, so nothing is announced twice.
- Escape always exits, from anywhere, including while focus is on the target.
- `aria-modal` is set only in fully blocking mode.
- Every animation collapses under `prefers-reduced-motion`.

:::caution[What is still yours.]
Write step text that makes sense read aloud
without the visual spotlight — "the button below" means nothing to a
screen-reader user. Give every target an accessible name. And if a step teaches a
drag interaction, provide a keyboard path to the same outcome.

A library cannot make an integration conformant. It can only stop being the
reason it is not.
:::
</content>
