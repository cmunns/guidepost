/**
 * Native `inert` does three jobs a hand-rolled focus trap has to fake:
 * it removes content from the tab order, blocks pointer events, and hides it
 * from the accessibility tree. `inert` is inherited by descendants and cannot
 * be undone on a child, so to keep one element reachable we walk up its
 * ancestor chain and mark only the *siblings* along that chain.
 *
 * The result: Tab cycles through exactly the card plus (optionally) the
 * spotlighted element, with no keydown interception and no sentinel nodes.
 */
export class InertManager {
  #touched: HTMLElement[] = [];

  /**
   * @param allowed Elements that must stay reachable.
   * @param root    Subtree to make inert. Defaults to `document.body`.
   */
  apply(allowed: Array<Element | null | undefined>, root: HTMLElement = document.body): void {
    this.release();

    // `keep` is the ancestor *path* to each allowed element — those get walked
    // into. `leaves` are the allowed elements themselves — their whole subtree
    // stays untouched, which is the difference between "the tour card is
    // reachable" and "the tour card is inert along with everything else".
    const keep = new Set<Element>();
    const leaves = new Set<Element>();
    for (const el of allowed) {
      if (!el) continue;
      leaves.add(el);
      let node: Element | null = el.parentElement;
      while (node) {
        keep.add(node);
        node = node.parentElement;
      }
    }

    const walk = (parent: Element) => {
      for (const child of Array.from(parent.children)) {
        if (!(child instanceof HTMLElement) && !(child instanceof SVGElement)) continue;
        if (leaves.has(child)) continue;
        if (keep.has(child)) {
          walk(child);
          continue;
        }
        const el = child as HTMLElement;
        // Never touch what is already inert — restoring it would be a change.
        if (el.inert) continue;
        el.inert = true;
        this.#touched.push(el);
      }
    };

    walk(root);
  }

  release(): void {
    for (const el of this.#touched) el.inert = false;
    this.#touched = [];
  }
}
